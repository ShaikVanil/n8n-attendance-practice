import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:global_protect_app/core/services/notification_service.dart';
import 'package:global_protect_app/features/clock_in/data/models/offline_clock_in_request_model.dart';
import 'package:global_protect_app/features/notifications/domain/entities/notification.dart';
import '../../features/clock_in/data/datasources/attendance_local_data_source.dart';
import '../../features/clock_in/data/datasources/attendance_remote_data_source.dart';
import '../network/network_info.dart';
import '../../features/clock_in/domain/entities/offline_clock_in_request.dart';

class SyncService {
  final AttendanceLocalDataSource localDataSource;
  final AttendanceRemoteDataSource remoteDataSource;
  final NetworkInfo networkInfo;
  final NotificationService notificationService; // Add this
  
  StreamSubscription<ConnectivityResult>? _connectivitySubscription;
  Timer? _syncTimer;
  bool _isSyncing = false;
  
  final StreamController<SyncStatus> _syncStatusController = StreamController<SyncStatus>.broadcast();
  Stream<SyncStatus> get syncStatusStream => _syncStatusController.stream;

  SyncService({
    required this.localDataSource,
    required this.remoteDataSource,
    required this.networkInfo,
    required this.notificationService,
  });

  void startMonitoring() {
    _connectivitySubscription = networkInfo.onConnectivityChanged.listen((result) {
      if (result != ConnectivityResult.none) {
        _scheduleSyncAttempt();
      }
    });
    
    // Periodic sync attempts
    _syncTimer = Timer.periodic(const Duration(minutes: 5), (_) {
      _scheduleSyncAttempt();
    });
  }

  void stopMonitoring() {
    _connectivitySubscription?.cancel();
    _syncTimer?.cancel();
  }

  Future<void> _scheduleSyncAttempt() async {
    if (_isSyncing) return;
    
    if (await networkInfo.isConnected) {
      await syncPendingRequests();
    }
  }

  Future<SyncResult> syncPendingRequests() async {
    if (_isSyncing) {
      return SyncResult(success: false, message: 'Sync already in progress');
    }

    _isSyncing = true;
    _syncStatusController.add(SyncStatus.syncing);

    // Show sync start notification
    await notificationService.showSyncNotification(
      'Syncing Data',
      'Synchronizing your attendance data...',
    );

    try {
      final pendingRequests = await localDataSource.getPendingOfflineRequests();
      
      if (pendingRequests.isEmpty) {
        _syncStatusController.add(SyncStatus.idle);
        return SyncResult(success: true, message: 'No pending requests');
      }

      int successCount = 0;
      int failureCount = 0;
      
      for (final request in pendingRequests) {
        try {
          // Update status to syncing
          await localDataSource.updateOfflineRequest(
            OfflineClockInRequestModel.fromEntity(
              request.copyWith(status: OfflineRequestStatus.syncing)
            )
          );

          if (request.isClockIn) {
            await remoteDataSource.clockIn(
              location: request.location,
              notes: request.notes,
            );
          } else {
            await remoteDataSource.clockOut(
              attendanceId: request.attendanceId!,
              notes: request.notes,
              location: request.location,
            );
          }

          // Mark as completed and remove
          await localDataSource.removeOfflineRequest(request.id);
          successCount++;
          
        } catch (e) {
          // Mark as failed and increment retry count
          final updatedRequest = request.copyWith(
            status: OfflineRequestStatus.failed,
            retryCount: request.retryCount + 1,
          );
          
          if (updatedRequest.canRetry) {
            await localDataSource.updateOfflineRequest(
              OfflineClockInRequestModel.fromEntity(updatedRequest)
            );
          } else {
            // Remove after max retries
            await localDataSource.removeOfflineRequest(request.id);
          }
          
          failureCount++;
        }
      }

      final message = 'Synced $successCount requests, $failureCount failed';
      _syncStatusController.add(SyncStatus.idle);
      
      // Show sync completion notification
      if (failureCount == 0) {
        await notificationService.showSuccessNotification(
          'Sync Complete',
          'Successfully synced $successCount attendance records.',
        );
      } else {
        await notificationService.showErrorNotification(
          'Sync Partially Failed',
          'Synced $successCount records, $failureCount failed. Will retry automatically.',
          actions: [
            const NotificationAction(
              id: 'retry_sync',
              label: 'Retry Now',
              action: 'retry_sync',
            ),
          ],
        );
      }
      
      return SyncResult(
        success: failureCount == 0,
        message: message,
        syncedCount: successCount,
        failedCount: failureCount,
      );
      
    } catch (e) {
      _syncStatusController.add(SyncStatus.error);
      
      // Show sync error notification
      await notificationService.showErrorNotification(
        'Sync Failed',
        'Failed to sync attendance data. Will retry automatically.',
        actions: [
          const NotificationAction(
            id: 'retry_sync',
            label: 'Retry Now',
            action: 'retry_sync',
          ),
        ],
      );
      
      return SyncResult(success: false, message: 'Sync failed: $e');
    } finally {
      _isSyncing = false;
    }
  }

  Future<void> forceSyncNow() async {
    await syncPendingRequests();
  }

  void dispose() {
    stopMonitoring();
    _syncStatusController.close();
  }
}

enum SyncStatus {
  idle,
  syncing,
  error,
}

class SyncResult {
  final bool success;
  final String message;
  final int syncedCount;
  final int failedCount;

  SyncResult({
    required this.success,
    required this.message,
    this.syncedCount = 0,
    this.failedCount = 0,
  });
}