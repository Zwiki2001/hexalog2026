import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:vibration/vibration.dart';
import '../services/sheets_service.dart';
import '../models/order_result.dart';

class ScanScreen extends StatefulWidget {
  const ScanScreen({super.key});

  @override
  State<ScanScreen> createState() => _ScanScreenState();
}

class _ScanScreenState extends State<ScanScreen>
    with SingleTickerProviderStateMixin {
  final MobileScannerController _scanner = MobileScannerController(
    detectionSpeed: DetectionSpeed.noDuplicates,
    returnImage: false,
  );

  bool _isProcessing = false;
  OrderResult? _result;
  String? _errorMessage;

  late AnimationController _panelAnim;
  late Animation<Offset> _slideAnim;

  @override
  void initState() {
    super.initState();
    _panelAnim = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 280),
    );
    _slideAnim = Tween<Offset>(
      begin: const Offset(0, 1),
      end: Offset.zero,
    ).animate(CurvedAnimation(parent: _panelAnim, curve: Curves.easeOut));

    // Warm up the Sheets connection on app start
    SheetsService().initialize().catchError((_) {});
  }

  @override
  void dispose() {
    _scanner.dispose();
    _panelAnim.dispose();
    super.dispose();
  }

  Future<void> _handleScan(String code) async {
    if (_isProcessing || code.trim().isEmpty) return;
    setState(() {
      _isProcessing = true;
      _result = null;
      _errorMessage = null;
    });
    await _scanner.stop();

    try {
      final result = await SheetsService().processOrder(code.trim());
      if (!mounted) return;
      setState(() {
        _result = result;
        _isProcessing = false;
      });
      _panelAnim.forward(from: 0);
      await _vibrate(result.found);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _errorMessage = e.toString().replaceAll('Exception: ', '');
        _isProcessing = false;
      });
      _panelAnim.forward(from: 0);
    }
  }

  Future<void> _vibrate(bool success) async {
    final hasVibrator = await Vibration.hasVibrator();
    if (hasVibrator != true) return;
    if (success) {
      Vibration.vibrate(duration: 200);
    } else {
      Vibration.vibrate(pattern: [0, 150, 80, 150]);
    }
  }

  void _resetScan() {
    _panelAnim.reverse().then((_) {
      if (!mounted) return;
      setState(() {
        _result = null;
        _errorMessage = null;
      });
      _scanner.start();
    });
  }

  void _openManualInput() async {
    await _scanner.stop();
    if (!mounted) return;
    final controller = TextEditingController();
    final value = await showDialog<String>(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: const Color(0xFF1E1E2E),
        title: const Text('Enter Order Number',
            style: TextStyle(color: Colors.white)),
        content: TextField(
          controller: controller,
          autofocus: true,
          textCapitalization: TextCapitalization.characters,
          style: const TextStyle(color: Colors.white, fontSize: 20),
          decoration: InputDecoration(
            hintText: 'e.g. ORD12345',
            hintStyle: const TextStyle(color: Colors.white38),
            filled: true,
            fillColor: Colors.white10,
            border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: BorderSide.none),
          ),
          onSubmitted: (v) => Navigator.pop(context, v),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel',
                style: TextStyle(color: Colors.white54, fontSize: 16)),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, controller.text),
            style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF3A86FF)),
            child: const Text('Search',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );

    if (value != null && value.trim().isNotEmpty) {
      _handleScan(value.trim());
    } else {
      _scanner.start();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          // ── Camera view ──────────────────────────────────────────
          MobileScanner(
            controller: _scanner,
            onDetect: (capture) {
              final code = capture.barcodes.firstOrNull?.rawValue;
              if (code != null) _handleScan(code);
            },
          ),

          // ── Top bar ──────────────────────────────────────────────
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: Container(
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [Colors.black, Colors.transparent],
                ),
              ),
              padding: EdgeInsets.only(
                top: MediaQuery.of(context).padding.top + 8,
                bottom: 16,
                left: 16,
                right: 8,
              ),
              child: Row(
                children: [
                  const Icon(Icons.warehouse_rounded,
                      color: Color(0xFF3A86FF), size: 30),
                  const SizedBox(width: 10),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Logistics Scanner',
                            style: TextStyle(
                                color: Colors.white,
                                fontSize: 20,
                                fontWeight: FontWeight.bold)),
                        Text('Point camera at barcode',
                            style: TextStyle(
                                color: Colors.white54, fontSize: 13)),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.keyboard_alt_outlined,
                        color: Colors.white, size: 28),
                    onPressed: _isProcessing ? null : _openManualInput,
                    tooltip: 'Manual input',
                  ),
                ],
              ),
            ),
          ),

          // ── Scan frame (visible when idle) ───────────────────────
          if (!_isProcessing && _result == null && _errorMessage == null)
            Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  _ScanFrame(),
                  const SizedBox(height: 20),
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 16, vertical: 8),
                    decoration: BoxDecoration(
                      color: Colors.black54,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: const Text('Align barcode inside the frame',
                        style:
                            TextStyle(color: Colors.white70, fontSize: 14)),
                  ),
                ],
              ),
            ),

          // ── Processing spinner ───────────────────────────────────
          if (_isProcessing)
            const Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  SizedBox(
                    width: 60,
                    height: 60,
                    child: CircularProgressIndicator(
                        color: Color(0xFF3A86FF),
                        strokeWidth: 4),
                  ),
                  SizedBox(height: 16),
                  Text('Checking order...',
                      style:
                          TextStyle(color: Colors.white, fontSize: 18)),
                ],
              ),
            ),

          // ── Result panel (slides up from bottom) ─────────────────
          if (_result != null || _errorMessage != null)
            Positioned(
              bottom: 0,
              left: 0,
              right: 0,
              child: SlideTransition(
                position: _slideAnim,
                child: _buildResultPanel(),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildResultPanel() {
    if (_errorMessage != null) return _errorPanel();
    final r = _result!;
    return r.found ? _successPanel(r) : _warningPanel(r);
  }

  // ── SUCCESS (green) ────────────────────────────────────────────
  Widget _successPanel(OrderResult r) {
    return _basePanel(
      color: const Color(0xFF0D3320),
      borderColor: const Color(0xFF2ECC71),
      icon: Icons.check_circle_rounded,
      iconColor: const Color(0xFF2ECC71),
      title: 'ORDER RECEIVED',
      titleColor: const Color(0xFF2ECC71),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _row('Order', r.orderNumber),
          _row('Customer', r.customer),
          _row('Status', r.status, valueColor: const Color(0xFF2ECC71)),
          _row('Time', r.date),
        ],
      ),
      buttonLabel: 'SCAN NEXT',
      buttonColor: const Color(0xFF2ECC71),
    );
  }

  // ── WARNING: unregistered order (yellow) ───────────────────────
  Widget _warningPanel(OrderResult r) {
    return _basePanel(
      color: const Color(0xFF2D1F00),
      borderColor: const Color(0xFFF39C12),
      icon: Icons.warning_amber_rounded,
      iconColor: const Color(0xFFF39C12),
      title: 'NOT IN SYSTEM',
      titleColor: const Color(0xFFF39C12),
      subtitle: 'Order was received and logged in the sheet (highlighted yellow).',
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _row('Scanned', r.orderNumber),
          _row('Added as', 'Received (Unregistered)',
              valueColor: const Color(0xFFF39C12)),
          _row('Time', r.date),
        ],
      ),
      buttonLabel: 'SCAN NEXT',
      buttonColor: const Color(0xFFF39C12),
    );
  }

  // ── ERROR panel (red) ──────────────────────────────────────────
  Widget _errorPanel() {
    return _basePanel(
      color: const Color(0xFF2D0000),
      borderColor: Colors.redAccent,
      icon: Icons.error_rounded,
      iconColor: Colors.redAccent,
      title: 'CONNECTION ERROR',
      titleColor: Colors.redAccent,
      subtitle: _errorMessage ?? 'Unknown error',
      body: const SizedBox.shrink(),
      buttonLabel: 'TRY AGAIN',
      buttonColor: Colors.redAccent,
    );
  }

  Widget _basePanel({
    required Color color,
    required Color borderColor,
    required IconData icon,
    required Color iconColor,
    required String title,
    required Color titleColor,
    String? subtitle,
    required Widget body,
    required String buttonLabel,
    required Color buttonColor,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: color,
        borderRadius:
            const BorderRadius.vertical(top: Radius.circular(24)),
        border: Border(
          top: BorderSide(color: borderColor, width: 2),
        ),
      ),
      padding: EdgeInsets.fromLTRB(
          24, 20, 24, MediaQuery.of(context).padding.bottom + 16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Drag indicator
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.white24,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Icon(icon, color: iconColor, size: 34),
              const SizedBox(width: 12),
              Expanded(
                child: Text(title,
                    style: TextStyle(
                        color: titleColor,
                        fontSize: 22,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 1.0)),
              ),
            ],
          ),
          if (subtitle != null) ...[
            const SizedBox(height: 8),
            Text(subtitle,
                style:
                    TextStyle(color: titleColor.withOpacity(0.8), fontSize: 14)),
          ],
          const SizedBox(height: 16),
          body,
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            height: 58,
            child: ElevatedButton.icon(
              onPressed: _resetScan,
              icon: const Icon(Icons.qr_code_scanner, size: 22),
              label: Text(buttonLabel,
                  style: const TextStyle(
                      fontSize: 18, fontWeight: FontWeight.bold)),
              style: ElevatedButton.styleFrom(
                backgroundColor: buttonColor,
                foregroundColor: Colors.black,
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14)),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _row(String label, String value, {Color valueColor = Colors.white}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 90,
            child: Text('$label:',
                style: const TextStyle(
                    color: Colors.white38,
                    fontSize: 15,
                    fontWeight: FontWeight.w500)),
          ),
          Expanded(
            child: Text(value,
                style: TextStyle(
                    color: valueColor,
                    fontSize: 17,
                    fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );
  }
}

// ── Animated scan-frame widget ─────────────────────────────────────
class _ScanFrame extends StatefulWidget {
  @override
  State<_ScanFrame> createState() => _ScanFrameState();
}

class _ScanFrameState extends State<_ScanFrame>
    with SingleTickerProviderStateMixin {
  late AnimationController _anim;
  late Animation<double> _pulse;

  @override
  void initState() {
    super.initState();
    _anim = AnimationController(
        vsync: this, duration: const Duration(milliseconds: 1200))
      ..repeat(reverse: true);
    _pulse = Tween<double>(begin: 0.6, end: 1.0).animate(
        CurvedAnimation(parent: _anim, curve: Curves.easeInOut));
  }

  @override
  void dispose() {
    _anim.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _pulse,
      builder: (_, __) => CustomPaint(
        size: const Size(280, 160),
        painter: _FramePainter(opacity: _pulse.value),
      ),
    );
  }
}

class _FramePainter extends CustomPainter {
  final double opacity;
  _FramePainter({required this.opacity});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = const Color(0xFF3A86FF).withOpacity(opacity)
      ..strokeWidth = 3
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;
    const r = 12.0;
    const len = 30.0;
    final corners = [
      Offset(0, 0),
      Offset(size.width, 0),
      Offset(size.width, size.height),
      Offset(0, size.height),
    ];
    final dirs = [
      [Offset(len, 0), Offset(0, len)],
      [Offset(-len, 0), Offset(0, len)],
      [Offset(-len, 0), Offset(0, -len)],
      [Offset(len, 0), Offset(0, -len)],
    ];
    for (int i = 0; i < 4; i++) {
      final c = corners[i];
      final d = dirs[i];
      canvas.drawLine(c + d[0], c, paint);
      canvas.drawLine(c, c + d[1], paint);
    }
    // Center crosshair
    final midPaint = Paint()
      ..color = Colors.white.withOpacity(opacity * 0.4)
      ..strokeWidth = 1;
    canvas.drawLine(Offset(size.width / 2 - 10, size.height / 2),
        Offset(size.width / 2 + 10, size.height / 2), midPaint);
    canvas.drawLine(Offset(size.width / 2, size.height / 2 - 10),
        Offset(size.width / 2, size.height / 2 + 10), midPaint);
  }

  @override
  bool shouldRepaint(_FramePainter old) => old.opacity != opacity;
}
