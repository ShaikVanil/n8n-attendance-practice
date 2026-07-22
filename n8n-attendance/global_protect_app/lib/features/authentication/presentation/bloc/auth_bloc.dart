import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../core/usecases/usecase.dart';
import '../../domain/usecases/login_usecase.dart';
import '../../domain/usecases/logout_usecase.dart';
import '../../domain/usecases/get_current_user_usecase.dart';
import '../../domain/usecases/refresh_token_usecase.dart';
import '../../data/services/token_refresh_service.dart';
import 'auth_event.dart';
import 'auth_state.dart';

class AuthBloc extends Bloc<AuthEvent, AuthState> {
  final LoginUseCase loginUseCase;
  final LogoutUseCase logoutUseCase;
  final GetCurrentUserUseCase getCurrentUserUseCase;
  final RefreshTokenUseCase refreshTokenUseCase;
  final TokenRefreshService tokenRefreshService;

  AuthBloc({
    required this.loginUseCase,
    required this.logoutUseCase,
    required this.getCurrentUserUseCase,
    required this.refreshTokenUseCase,
    required this.tokenRefreshService,
  }) : super(AuthInitial()) {
    on<CheckAuthStatusEvent>(_onCheckAuthStatus);
    on<LoginEvent>(_onLogin);
    on<LogoutEvent>(_onLogout);
    on<LogoutRequestedEvent>(_onLogoutRequested);
    on<LogoutConfirmedEvent>(_onLogoutConfirmed);
    on<LogoutCancelledEvent>(_onLogoutCancelled);
    on<RefreshTokenEvent>(_onRefreshToken);
    on<StartTokenMonitoringEvent>(_onStartTokenMonitoring);
    on<StopTokenMonitoringEvent>(_onStopTokenMonitoring);
    on<TokenRefreshSuccessEvent>(_onTokenRefreshSuccess);
    on<TokenRefreshFailedEvent>(_onTokenRefreshFailed);
  }

  Future<void> _onCheckAuthStatus(
    CheckAuthStatusEvent event,
    Emitter<AuthState> emit,
  ) async {
    emit(AuthLoading());
    
    final result = await getCurrentUserUseCase(NoParams());
    result.fold(
      (failure) => emit(AuthUnauthenticated()),
      (user) {
        emit(AuthAuthenticated(user: user));
        // Start token monitoring when user is authenticated
        add(StartTokenMonitoringEvent());
      },
    );
  }

  Future<void> _onLogin(
    LoginEvent event,
    Emitter<AuthState> emit,
  ) async {
    emit(AuthLoading());
    
    final result = await loginUseCase(
      LoginParams(email: event.email, password: event.password),
    );
    
    result.fold(
      (failure) => emit(AuthError(message: failure.message)),
      (user) {
        emit(AuthAuthenticated(user: user));
        // Start token monitoring after successful login
        add(StartTokenMonitoringEvent());
      },
    );
  }

  Future<void> _onLogout(
    LogoutEvent event,
    Emitter<AuthState> emit,
  ) async {
    emit(AuthLoading());
    
    // Stop token monitoring before logout
    add(StopTokenMonitoringEvent());
    
    final result = await logoutUseCase(NoParams());
    result.fold(
      (failure) => emit(AuthError(message: failure.message)),
      (_) => emit(AuthUnauthenticated()),
    );
  }

  Future<void> _onLogoutRequested(
    LogoutRequestedEvent event,
    Emitter<AuthState> emit,
  ) async {
    if (state is AuthAuthenticated) {
      final currentUser = (state as AuthAuthenticated).user;
      emit(AuthLogoutRequested(user: currentUser));
    }
  }

  Future<void> _onLogoutConfirmed(
    LogoutConfirmedEvent event,
    Emitter<AuthState> emit,
  ) async {
    emit(AuthLoading());
    
    // Stop token monitoring before logout
    add(StopTokenMonitoringEvent());
    
    final result = await logoutUseCase(NoParams());
    result.fold(
      (failure) => emit(AuthError(message: failure.message)),
      (_) => emit(AuthUnauthenticated()),
    );
  }

  Future<void> _onLogoutCancelled(
    LogoutCancelledEvent event,
    Emitter<AuthState> emit,
  ) async {
    if (state is AuthLogoutRequested) {
      final user = (state as AuthLogoutRequested).user;
      emit(AuthAuthenticated(user: user));
    }
  }

  Future<void> _onRefreshToken(
    RefreshTokenEvent event,
    Emitter<AuthState> emit,
  ) async {
    // Don't show loading state for background refresh
    final currentState = state;
    
    final result = await refreshTokenUseCase(NoParams());
    result.fold(
      (failure) {
        // If refresh fails, logout user
        emit(AuthUnauthenticated());
        add(StopTokenMonitoringEvent());
      },
      (user) {
        // Update user data without changing loading state
        if (currentState is AuthAuthenticated) {
          emit(AuthAuthenticated(user: user));
        }
      },
    );
  }

  Future<void> _onStartTokenMonitoring(
    StartTokenMonitoringEvent event,
    Emitter<AuthState> emit,
  ) async {
    await tokenRefreshService.startTokenRefreshMonitoring();
  }

  Future<void> _onStopTokenMonitoring(
    StopTokenMonitoringEvent event,
    Emitter<AuthState> emit,
  ) async {
    tokenRefreshService.stopTokenRefreshMonitoring();
  }

  Future<void> _onTokenRefreshSuccess(
    TokenRefreshSuccessEvent event,
    Emitter<AuthState> emit,
  ) async {
    // Update user data silently in background
    if (state is AuthAuthenticated) {
      emit(AuthAuthenticated(user: event.user));
    }
  }

  Future<void> _onTokenRefreshFailed(
    TokenRefreshFailedEvent event,
    Emitter<AuthState> emit,
  ) async {
    // Force logout on token refresh failure
    emit(AuthUnauthenticated());
    add(StopTokenMonitoringEvent());
  }

  @override
  Future<void> close() {
    tokenRefreshService.dispose();
    return super.close();
  }
}