import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../../services/theme_service.dart';

// Events
abstract class ThemeEvent extends Equatable {
  const ThemeEvent();
  
  @override
  List<Object> get props => [];
}

class LoadThemeEvent extends ThemeEvent {}

class ChangeThemeEvent extends ThemeEvent {
  final ThemeMode themeMode;
  
  const ChangeThemeEvent(this.themeMode);
  
  @override
  List<Object> get props => [themeMode];
}

class ToggleThemeEvent extends ThemeEvent {}

// State
class ThemeState extends Equatable {
  final ThemeMode themeMode;
  
  const ThemeState({required this.themeMode});
  
  @override
  List<Object> get props => [themeMode];
}

// Bloc
class ThemeBloc extends Bloc<ThemeEvent, ThemeState> {
  final ThemeService _themeService;
  
  ThemeBloc(this._themeService) : super(const ThemeState(themeMode: ThemeMode.system)) {
    on<LoadThemeEvent>(_onLoadTheme);
    on<ChangeThemeEvent>(_onChangeTheme);
    on<ToggleThemeEvent>(_onToggleTheme);
  }
  
  void _onLoadTheme(LoadThemeEvent event, Emitter<ThemeState> emit) {
    final themeMode = _themeService.getThemeMode();
    emit(ThemeState(themeMode: themeMode));
  }
  
  Future<void> _onChangeTheme(ChangeThemeEvent event, Emitter<ThemeState> emit) async {
    await _themeService.setThemeMode(event.themeMode);
    emit(ThemeState(themeMode: event.themeMode));
  }
  
  Future<void> _onToggleTheme(ToggleThemeEvent event, Emitter<ThemeState> emit) async {
    final currentMode = state.themeMode;
    ThemeMode newMode;
    
    switch (currentMode) {
      case ThemeMode.system:
        newMode = ThemeMode.light;
        break;
      case ThemeMode.light:
        newMode = ThemeMode.dark;
        break;
      case ThemeMode.dark:
        newMode = ThemeMode.system;
        break;
    }
    
    await _themeService.setThemeMode(newMode);
    emit(ThemeState(themeMode: newMode));
  }
}