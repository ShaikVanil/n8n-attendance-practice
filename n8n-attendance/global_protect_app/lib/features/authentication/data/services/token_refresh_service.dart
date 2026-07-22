import 'dart:async';
import 'dart:math';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/foundation.dart';
import '../../../../core/network/network_info.dart';
import '../../domain/repositories/auth_repository.dart';

class TokenRefreshService {
  final AuthRepository authRepository;
  final NetworkInfo networkInfo;
  
  Timer? _refreshTimer;
  StreamSubscription? _networkSubscription;
  int _retryCount = 0;
  static const int _maxRetries = 3;
  static const Duration _baseRetryDelay = Duration(seconds: 30);
  
  bool _isRefreshing = false;
  final _refreshCompleter = Completer<void>();

  TokenRefreshService({
    required this.authRepository,
    required this.networkInfo,
  });

  /// Start automatic token refresh monitoring
  Future<void> startTokenRefreshMonitoring() async {
    await _scheduleNextRefresh();
    _listenToNetworkChanges();
  }

  /// Stop automatic token refresh monitoring
  void stopTokenRefreshMonitoring() {
    _refreshTimer?.cancel();
    _networkSubscription?.cancel();
    _refreshTimer = null;
    _networkSubscription = null;
  }

  /// Manually trigger token refresh
  Future<bool> refreshTokenNow() async {
    if (_isRefreshing) {
      await _refreshCompleter.future;
      return true;
    }

    return await _performTokenRefresh();
  }

  /// Schedule the next token refresh check
  Future<void> _scheduleNextRefresh() async {
    _refreshTimer?.cancel();
    
    final expiryTime = await authRepository.getTokenExpiryTime();
    if (expiryTime == null) return;

    // Schedule refresh 5 minutes before expiry
    final refreshTime = expiryTime.subtract(const Duration(minutes: 5));
    final now = DateTime.now();
    
    Duration delay;
    if (refreshTime.isBefore(now)) {
      // Token needs immediate refresh
      delay = Duration.zero;
    } else {
      delay = refreshTime.difference(now);
    }

    _refreshTimer = Timer(delay, () async {
      await _performTokenRefresh();
    });

    if (kDebugMode) {
      print('Token refresh scheduled in ${delay.inMinutes} minutes');
    }
  }

  /// Listen to network connectivity changes
  void _listenToNetworkChanges() {
    _networkSubscription = networkInfo.onConnectivityChanged.listen((result) async {
      if (result != ConnectivityResult.none) {
        // Network is back, check if we need to refresh token
        final shouldRefresh = await authRepository.shouldRefreshToken();
        if (shouldRefresh) {
          await _performTokenRefresh();
        }
      }
    });
  }

  /// Perform the actual token refresh with retry logic
  Future<bool> _performTokenRefresh() async {
    if (_isRefreshing) return true;
    
    _isRefreshing = true;
    
    try {
      // Check network connectivity
      if (!await networkInfo.isConnected) {
        if (kDebugMode) {
          print('Token refresh skipped: No network connection');
        }
        return false;
      }

      final result = await authRepository.refreshToken();
      
      return result.fold(
        (failure) async {
          if (kDebugMode) {
            print('Token refresh failed: ${failure.message}');
          }
          
          // Implement exponential backoff for retries
          if (_retryCount < _maxRetries) {
            _retryCount++;
            final retryDelay = _calculateRetryDelay(_retryCount);
            
            if (kDebugMode) {
              print('Retrying token refresh in ${retryDelay.inSeconds} seconds (attempt $_retryCount/$_maxRetries)');
            }
            
            Timer(retryDelay, () async {
              await _performTokenRefresh();
            });
            
            return false;
          } else {
            // Max retries reached, user needs to login again
            _retryCount = 0;
            if (kDebugMode) {
              print('Max retry attempts reached. User needs to login again.');
            }
            return false;
          }
        },
        (user) async {
          _retryCount = 0; // Reset retry count on success
          if (kDebugMode) {
            print('Token refreshed successfully for user: ${user.email}');
          }
          
          // Schedule next refresh
          await _scheduleNextRefresh();
          return true;
        },
      );
    } finally {
      _isRefreshing = false;
      if (!_refreshCompleter.isCompleted) {
        _refreshCompleter.complete();
      }
    }
  }

  /// Calculate retry delay with exponential backoff
  Duration _calculateRetryDelay(int retryCount) {
    final baseDelayMs = _baseRetryDelay.inMilliseconds;
    final exponentialDelay = baseDelayMs * pow(2, retryCount - 1);
    
    // Add jitter to prevent thundering herd
    final jitter = Random().nextInt(1000); // 0-1 second jitter
    
    return Duration(milliseconds: exponentialDelay.toInt() + jitter);
  }

  /// Dispose resources
  void dispose() {
    stopTokenRefreshMonitoring();
  }
}