import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../bloc/auth_bloc.dart';
import '../bloc/auth_event.dart';

class LogoutConfirmationDialog extends StatelessWidget {
  const LogoutConfirmationDialog({super.key});

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Confirm Logout'),
      content: const Text(
        'Are you sure you want to logout? You will need to login again to access the app.',
      ),
      actions: [
        TextButton(
          onPressed: () {
            Navigator.of(context).pop();
            context.read<AuthBloc>().add(LogoutCancelledEvent());
          },
          child: const Text('Cancel'),
        ),
        ElevatedButton(
          onPressed: () {
            Navigator.of(context).pop();
            context.read<AuthBloc>().add(LogoutConfirmedEvent());
          },
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.red,
            foregroundColor: Colors.white,
          ),
          child: const Text('Logout'),
        ),
      ],
    );
  }

  static Future<void> show(BuildContext context) {
    return showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (BuildContext context) {
        return const LogoutConfirmationDialog();
      },
    );
  }
}