import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../core/theme/bloc/theme_bloc.dart';

class ThemeToggleButton extends StatelessWidget {
  const ThemeToggleButton({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<ThemeBloc, ThemeState>(
      builder: (context, state) {
        IconData icon;
        String tooltip;
        
        switch (state.themeMode) {
          case ThemeMode.system:
            icon = Icons.brightness_auto;
            tooltip = 'Auto Theme';
            break;
          case ThemeMode.light:
            icon = Icons.light_mode;
            tooltip = 'Light Theme';
            break;
          case ThemeMode.dark:
            icon = Icons.dark_mode;
            tooltip = 'Dark Theme';
            break;
        }
        
        return IconButton(
          icon: AnimatedSwitcher(
            duration: const Duration(milliseconds: 300),
            child: Icon(
              icon,
              key: ValueKey(state.themeMode),
            ),
          ),
          tooltip: tooltip,
          onPressed: () {
            context.read<ThemeBloc>().add(ToggleThemeEvent());
          },
        );
      },
    );
  }
}