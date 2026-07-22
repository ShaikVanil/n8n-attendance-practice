import 'package:flutter/material.dart';

class ClockOutConfirmationDialog extends StatelessWidget {
  final String? currentLocation;
  final Duration? workedDuration;
  final VoidCallback onConfirm;
  final VoidCallback? onCancel;

  const ClockOutConfirmationDialog({
    super.key,
    this.currentLocation,
    this.workedDuration,
    required this.onConfirm,
    this.onCancel,
  });

  String _formatDuration(Duration? duration) {
    if (duration == null) return 'Unknown';
    final hours = duration.inHours;
    final minutes = duration.inMinutes.remainder(60);
    return '${hours}h ${minutes}m';
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Row(
        children: [
          Icon(Icons.logout, color: Colors.red),
          SizedBox(width: 8),
          Text('Confirm Clock Out'),
        ],
      ),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Are you sure you want to clock out?',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500),
          ),
          const SizedBox(height: 16),
          if (workedDuration != null) ...[
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.blue.shade50,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.blue.shade200),
              ),
              child: Row(
                children: [
                  const Icon(Icons.access_time, color: Colors.blue, size: 20),
                  const SizedBox(width: 8),
                  Text(
                    'Total time worked: ${_formatDuration(workedDuration)}',
                    style: const TextStyle(
                      color: Colors.blue,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
          ],
          if (currentLocation != null) ...[
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.green.shade50,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.green.shade200),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.location_on, color: Colors.green, size: 20),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Location: $currentLocation',
                      style: const TextStyle(
                        color: Colors.green,
                        fontSize: 13,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
      actions: [
        TextButton(
          onPressed: () {
            Navigator.of(context).pop();
            onCancel?.call();
          },
          child: const Text('Cancel'),
        ),
        ElevatedButton(
          onPressed: () {
            Navigator.of(context).pop();
            onConfirm();
          },
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.red.shade600,
            foregroundColor: Colors.white,
          ),
          child: const Text('Confirm Clock Out'),
        ),
      ],
    );
  }

  static Future<void> show({
    required BuildContext context,
    String? currentLocation,
    Duration? workedDuration,
    required VoidCallback onConfirm,
    VoidCallback? onCancel,
  }) {
    return showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (BuildContext context) {
        return ClockOutConfirmationDialog(
          currentLocation: currentLocation,
          workedDuration: workedDuration,
          onConfirm: onConfirm,
          onCancel: onCancel,
        );
      },
    );
  }
}