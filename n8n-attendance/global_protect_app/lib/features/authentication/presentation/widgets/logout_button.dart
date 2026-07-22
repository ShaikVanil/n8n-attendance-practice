import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../bloc/auth_bloc.dart';
import '../bloc/auth_event.dart';
import '../bloc/auth_state.dart';
import 'logout_confirmation_dialog.dart';

class LogoutButton extends StatelessWidget {
  const LogoutButton({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocListener<AuthBloc, AuthState>(
      listener: (context, state) {
        if (state is AuthLogoutRequested) {
          LogoutConfirmationDialog.show(context);
        }
      },
      child: IconButton(
        icon: const Icon(Icons.logout),
        onPressed: () {
          context.read<AuthBloc>().add(LogoutRequestedEvent());
        },
        tooltip: 'Logout',
      ),
    );
  }
}