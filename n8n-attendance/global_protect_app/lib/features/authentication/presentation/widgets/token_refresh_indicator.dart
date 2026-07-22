import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../bloc/auth_bloc.dart';
import '../bloc/auth_state.dart';
import '../../../../shared/themes/colors.dart';

class TokenRefreshIndicator extends StatelessWidget {
  final Widget child;
  
  const TokenRefreshIndicator({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return BlocListener<AuthBloc, AuthState>(
      listener: (context, state) {
        if (state is AuthUnauthenticated) {
          // Show session expired dialog
          _showSessionExpiredDialog(context);
        }
      },
      child: child,
    );
  }

  void _showSessionExpiredDialog(BuildContext context) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        title: const Text('Session Expired'),
        content: const Text(
          'Your session has expired. Please log in again to continue.',
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.of(context).pop();
              Navigator.of(context).pushNamedAndRemoveUntil(
                '/login',
                (route) => false,
              );
            },
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }
}