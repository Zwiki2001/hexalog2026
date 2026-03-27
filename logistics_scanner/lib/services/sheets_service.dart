import 'dart:convert';
import 'package:flutter/services.dart' show rootBundle;
import 'package:googleapis/sheets/v4.dart' as sheets;
import 'package:googleapis_auth/auth_io.dart';
import 'package:intl/intl.dart';
import '../models/order_result.dart';

class SheetsService {
  // ---------------------------------------------------------------
  // CONFIGURE THESE TWO VALUES BEFORE RUNNING THE APP
  // ---------------------------------------------------------------
  static const String spreadsheetId = 'YOUR_SPREADSHEET_ID_HERE';
  static const String sheetName = 'Sheet1';
  // ---------------------------------------------------------------

  static const int sheetId = 0; // 0 = first sheet tab

  static final SheetsService _instance = SheetsService._internal();
  factory SheetsService() => _instance;
  SheetsService._internal();

  sheets.SheetsApi? _sheetsApi;

  Future<void> initialize() async {
    if (_sheetsApi != null) return;
    final jsonString =
        await rootBundle.loadString('assets/service_account.json');
    final credentials =
        ServiceAccountCredentials.fromJson(json.decode(jsonString));
    final client = await clientViaServiceAccount(
      credentials,
      [sheets.SheetsApi.spreadsheetsScope],
    );
    _sheetsApi = sheets.SheetsApi(client);
  }

  Future<OrderResult> processOrder(String orderNumber) async {
    await initialize();
    final api = _sheetsApi!;
    final now = DateTime.now();
    final dateStr = DateFormat('yyyy-MM-dd HH:mm:ss').format(now);

    final response = await api.spreadsheets.values.get(
      spreadsheetId,
      '$sheetName!A:D',
    );

    final rows = response.values ?? [];
    int foundRowIndex = -1;
    String customer = '';

    // Row 0 is the header; data starts at row 1
    for (int i = 1; i < rows.length; i++) {
      if (rows[i].isNotEmpty &&
          rows[i][0].toString().trim().toUpperCase() ==
              orderNumber.trim().toUpperCase()) {
        foundRowIndex = i;
        customer =
            rows[i].length > 1 ? rows[i][1].toString() : 'Unknown';
        break;
      }
    }

    if (foundRowIndex != -1) {
      // Order found — update Status (col C) and Date (col D)
      final rowNumber = foundRowIndex + 1; // Sheets API is 1-indexed
      await api.spreadsheets.values.update(
        sheets.ValueRange(values: [
          ['Received', dateStr]
        ]),
        spreadsheetId,
        '$sheetName!C$rowNumber:D$rowNumber',
        valueInputOption: 'USER_ENTERED',
      );
      // Highlight row green
      await _colorRow(api, foundRowIndex, _greenColor());

      return OrderResult(
        found: true,
        orderNumber: orderNumber,
        customer: customer,
        status: 'Received',
        date: dateStr,
      );
    } else {
      // Order NOT in sheet — append it highlighted in yellow/orange
      final appendResponse = await api.spreadsheets.values.append(
        sheets.ValueRange(values: [
          [orderNumber, 'UNKNOWN - NOT IN SYSTEM', 'Received (Unregistered)', dateStr]
        ]),
        spreadsheetId,
        '$sheetName!A:D',
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
      );

      // Parse the appended row index from the response range string
      final updatedRange =
          appendResponse.updates?.updatedRange ?? '';
      final newRowIndex = _parseZeroBasedRowIndex(updatedRange, rows.length);
      await _colorRow(api, newRowIndex, _yellowColor());

      return OrderResult(
        found: false,
        orderNumber: orderNumber,
        customer: 'NOT IN SYSTEM',
        status: 'Received (Unregistered)',
        date: dateStr,
      );
    }
  }

  // Parse "Sheet1!A5:D5" → zero-based index 4
  int _parseZeroBasedRowIndex(String range, int fallback) {
    final match = RegExp(r'!A(\d+):').firstMatch(range);
    if (match != null) {
      return int.parse(match.group(1)!) - 1;
    }
    return fallback;
  }

  Future<void> _colorRow(
      sheets.SheetsApi api, int zeroBasedRowIndex, sheets.Color color) async {
    final request = sheets.Request()
      ..repeatCell = (sheets.RepeatCellRequest()
        ..range = (sheets.GridRange()
          ..sheetId = sheetId
          ..startRowIndex = zeroBasedRowIndex
          ..endRowIndex = zeroBasedRowIndex + 1
          ..startColumnIndex = 0
          ..endColumnIndex = 4)
        ..cell = (sheets.CellData()
          ..userEnteredFormat =
              (sheets.CellFormat()..backgroundColor = color))
        ..fields = 'userEnteredFormat.backgroundColor');

    await api.spreadsheets.batchUpdate(
      sheets.BatchUpdateSpreadsheetRequest(requests: [request]),
      spreadsheetId,
    );
  }

  sheets.Color _greenColor() =>
      sheets.Color(red: 0.2, green: 0.78, blue: 0.35, alpha: 1.0);

  sheets.Color _yellowColor() =>
      sheets.Color(red: 1.0, green: 0.85, blue: 0.2, alpha: 1.0);
}
