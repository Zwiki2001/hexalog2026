import 'package:flutter/material.dart';
import 'screens/scan_screen.dart';

void main() {
  runApp(const LogisticsApp());
}

class LogisticsApp extends StatelessWidget {
  const LogisticsApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Logistics Scanner',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF3A86FF),
          brightness: Brightness.dark,
        ),
        scaffoldBackgroundColor: Colors.black,
        useMaterial3: true,
      ),
      home: const ScanScreen(),
    );
  }
}
