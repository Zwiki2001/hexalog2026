class OrderResult {
  final String orderNumber;
  final String customer;
  final String status;
  final String date;
  final bool found;

  OrderResult({
    required this.orderNumber,
    required this.customer,
    required this.status,
    required this.date,
    required this.found,
  });
}
