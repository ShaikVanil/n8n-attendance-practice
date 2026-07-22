import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:global_protect_app/features/clock_in/presentation/bloc/attendance/attendance_event.dart';
import 'package:global_protect_app/features/clock_in/presentation/bloc/attendance/attendance_state.dart';
import '../../../../core/services/sync_service.dart';
import '../bloc/attendance/attendance_bloc.dart';

class NetworkStatusWidget extends StatefulWidget {
  const NetworkStatusWidget({super.key});

  @override
  State<NetworkStatusWidget> createState() => _NetworkStatusWidgetState();
}

class _NetworkStatusWidgetState extends State<NetworkStatusWidget> {
  late Stream<ConnectivityResult> _connectivityStream;
  ConnectivityResult _currentConnectivity = ConnectivityResult.none;
  SyncStatus _syncStatus = SyncStatus.idle;
  
  @override
  void initState() {
    super.initState();
    _connectivityStream = Connectivity().onConnectivityChanged;
    _checkInitialConnectivity();
  }
  
  Future<void> _checkInitialConnectivity() async {
    final result = await Connectivity().checkConnectivity();
    if (mounted) {
      setState(() {
        _currentConnectivity = result;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<ConnectivityResult>(
      stream: _connectivityStream,
      initialData: _currentConnectivity,
      builder: (context, connectivitySnapshot) {
        final connectivity = connectivitySnapshot.data ?? ConnectivityResult.none;
        
        return StreamBuilder<SyncStatus>(
          stream: context.read<SyncService>().syncStatusStream,
          initialData: SyncStatus.idle,
          builder: (context, syncSnapshot) {
            final syncStatus = syncSnapshot.data ?? SyncStatus.idle;
            
            return BlocBuilder<AttendanceBloc, AttendanceState>(
              builder: (context, state) {
                return _buildNetworkStatusCard(context, connectivity, syncStatus, state);
              },
            );
          },
        );
      },
    );
  }

  Widget _buildNetworkStatusCard(BuildContext context, ConnectivityResult connectivity, SyncStatus syncStatus, AttendanceState state) {
    final isOnline = connectivity != ConnectivityResult.none;
    final pendingCount = _getPendingRequestCount(state);
    final connectionQuality = _getConnectionQuality(connectivity);
    
    return Card(
      margin: const EdgeInsets.all(16),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header with status indicator
            Row(
              children: [
                _buildStatusIcon(isOnline, syncStatus),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _getStatusTitle(isOnline, syncStatus),
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: _getStatusColor(isOnline, syncStatus),
                        ),
                      ),
                      Text(
                        _getStatusSubtitle(connectivity, syncStatus),
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Colors.grey.shade600,
                        ),
                      ),
                    ],
                  ),
                ),
                // Manual sync button
                if (isOnline && syncStatus != SyncStatus.syncing && pendingCount > 0)
                  IconButton(
                    icon: const Icon(Icons.sync),
                    onPressed: () {
                      context.read<AttendanceBloc>().add(SyncOfflineRequestsEvent());
                    },
                    tooltip: 'Sync now',
                  ),
              ],
            ),
            
            const SizedBox(height: 12),
            
            // Connection details
            _buildConnectionDetails(connectivity, connectionQuality),
            
            // Pending sync count
            if (pendingCount > 0) ...[
              const SizedBox(height: 12),
              _buildPendingSyncInfo(context, pendingCount, syncStatus),
            ],
            
            // Sync progress
            if (syncStatus == SyncStatus.syncing) ...[
              const SizedBox(height: 12),
              _buildSyncProgress(state),
            ],
            
            // Connection quality guidance
            if (isOnline && connectionQuality != ConnectionQuality.excellent) ...[
              const SizedBox(height: 12),
              _buildConnectionGuidance(connectionQuality),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildStatusIcon(bool isOnline, SyncStatus syncStatus) {
    if (syncStatus == SyncStatus.syncing) {
      return SizedBox(
        width: 24,
        height: 24,
        child: CircularProgressIndicator(
          strokeWidth: 2,
          valueColor: AlwaysStoppedAnimation<Color>(Colors.blue.shade600),
        ),
      );
    }
    
    if (syncStatus == SyncStatus.error) {
      return Icon(Icons.sync_problem, color: Colors.red.shade600, size: 24);
    }
    
    if (isOnline) {
      return Icon(Icons.cloud_done, color: Colors.green.shade600, size: 24);
    } else {
      return Icon(Icons.cloud_off, color: Colors.orange.shade600, size: 24);
    }
  }

  String _getStatusTitle(bool isOnline, SyncStatus syncStatus) {
    if (syncStatus == SyncStatus.syncing) return 'Syncing';
    if (syncStatus == SyncStatus.error) return 'Sync Error';
    if (isOnline) return 'Online';
    return 'Offline';
  }

  String _getStatusSubtitle(ConnectivityResult connectivity, SyncStatus syncStatus) {
    if (syncStatus == SyncStatus.syncing) return 'Synchronizing data...';
    if (syncStatus == SyncStatus.error) return 'Failed to sync data';
    
    switch (connectivity) {
      case ConnectivityResult.wifi:
        return 'Connected via WiFi';
      case ConnectivityResult.mobile:
        return 'Connected via Mobile Data';
      case ConnectivityResult.ethernet:
        return 'Connected via Ethernet';
      case ConnectivityResult.none:
        return 'No internet connection';
      default:
        return 'Unknown connection';
    }
  }

  Color _getStatusColor(bool isOnline, SyncStatus syncStatus) {
    if (syncStatus == SyncStatus.syncing) return Colors.blue.shade600;
    if (syncStatus == SyncStatus.error) return Colors.red.shade600;
    if (isOnline) return Colors.green.shade600;
    return Colors.orange.shade600;
  }

  Widget _buildConnectionDetails(ConnectivityResult connectivity, ConnectionQuality quality) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.grey.shade50,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Row(
        children: [
          Icon(
            _getConnectionIcon(connectivity),
            size: 16,
            color: Colors.grey.shade600,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              _getConnectionDescription(connectivity),
              style: TextStyle(
                fontSize: 12,
                color: Colors.grey.shade700,
              ),
            ),
          ),
          _buildQualityIndicator(quality),
        ],
      ),
    );
  }

  Widget _buildPendingSyncInfo(BuildContext context, int count, SyncStatus syncStatus) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.amber.shade50,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.amber.shade200),
      ),
      child: Row(
        children: [
          Icon(Icons.pending_actions, color: Colors.amber.shade700, size: 16),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              '$count pending request${count > 1 ? 's' : ''} to sync',
              style: TextStyle(
                fontSize: 12,
                color: Colors.amber.shade800,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          if (syncStatus != SyncStatus.syncing)
            TextButton(
              onPressed: () {
                context.read<AttendanceBloc>().add(SyncOfflineRequestsEvent());
              },
              style: TextButton.styleFrom(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                minimumSize: Size.zero,
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              ),
              child: Text(
                'Sync Now',
                style: TextStyle(
                  fontSize: 12,
                  color: Colors.amber.shade800,
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildSyncProgress(AttendanceState state) {
    if (state is AttendanceSyncing) {
      final progress = state.totalRequests > 0 
          ? state.syncedRequests / state.totalRequests 
          : 0.0;
      
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Syncing ${state.syncedRequests}/${state.totalRequests}',
                style: const TextStyle(fontSize: 12),
              ),
              Text(
                '${(progress * 100).toInt()}%',
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500),
              ),
            ],
          ),
          const SizedBox(height: 4),
          LinearProgressIndicator(
            value: progress,
            backgroundColor: Colors.grey.shade200,
            valueColor: AlwaysStoppedAnimation<Color>(Colors.blue.shade600),
          ),
        ],
      );
    }
    
    return const SizedBox.shrink();
  }

  Widget _buildConnectionGuidance(ConnectionQuality quality) {
    final guidance = _getConnectionGuidance(quality);
    final color = _getGuidanceColor(quality);
    
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Row(
        children: [
          Icon(Icons.info_outline, color: color, size: 16),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              guidance,
              style: TextStyle(
                fontSize: 12,
                color: color,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildQualityIndicator(ConnectionQuality quality) {
    final color = _getQualityColor(quality);
    final bars = _getQualityBars(quality);
    
    return Row(
      children: List.generate(4, (index) {
        return Container(
          width: 3,
          height: 8 + (index * 2),
          margin: const EdgeInsets.only(left: 1),
          decoration: BoxDecoration(
            color: index < bars ? color : Colors.grey.shade300,
            borderRadius: BorderRadius.circular(1),
          ),
        );
      }),
    );
  }

  // Helper methods
  int _getPendingRequestCount(AttendanceState state) {
    if (state is AttendanceLoaded) {
      return state.pendingOfflineRequests;
    }
    if (state is AttendanceOfflineMode) {
      return state.queuedRequests;
    }
    return 0;
  }

  ConnectionQuality _getConnectionQuality(ConnectivityResult connectivity) {
    switch (connectivity) {
      case ConnectivityResult.wifi:
      case ConnectivityResult.ethernet:
        return ConnectionQuality.excellent;
      case ConnectivityResult.mobile:
        return ConnectionQuality.good;
      case ConnectivityResult.none:
        return ConnectionQuality.none;
      default:
        return ConnectionQuality.poor;
    }
  }

  IconData _getConnectionIcon(ConnectivityResult connectivity) {
    switch (connectivity) {
      case ConnectivityResult.wifi:
        return Icons.wifi;
      case ConnectivityResult.mobile:
        return Icons.signal_cellular_4_bar;
      case ConnectivityResult.none:
        return Icons.signal_cellular_off;
      default:
        return Icons.device_unknown;
    }
  }

  String _getConnectionDescription(ConnectivityResult connectivity) {
    switch (connectivity) {
      case ConnectivityResult.wifi:
        return 'WiFi connection active';
      case ConnectivityResult.mobile:
        return 'Mobile data connection';
      case ConnectivityResult.ethernet:
        return 'Ethernet connection';
      case ConnectivityResult.none:
        return 'No network connection';
      default:
        return 'Unknown connection type';
    }
  }

  String _getConnectionGuidance(ConnectionQuality quality) {
    switch (quality) {
      case ConnectionQuality.poor:
        return 'Poor connection. Clock-in may be slower than usual.';
      case ConnectionQuality.good:
        return 'Good connection. Consider using WiFi for better performance.';
      case ConnectionQuality.excellent:
        return 'Excellent connection quality.';
      case ConnectionQuality.none:
        return 'No connection. Clock-in will be queued for later sync.';
    }
  }

  Color _getGuidanceColor(ConnectionQuality quality) {
    switch (quality) {
      case ConnectionQuality.poor:
        return Colors.orange.shade600;
      case ConnectionQuality.good:
        return Colors.blue.shade600;
      case ConnectionQuality.excellent:
        return Colors.green.shade600;
      case ConnectionQuality.none:
        return Colors.red.shade600;
    }
  }

  Color _getQualityColor(ConnectionQuality quality) {
    switch (quality) {
      case ConnectionQuality.excellent:
        return Colors.green;
      case ConnectionQuality.good:
        return Colors.blue;
      case ConnectionQuality.poor:
        return Colors.orange;
      case ConnectionQuality.none:
        return Colors.red;
    }
  }

  int _getQualityBars(ConnectionQuality quality) {
    switch (quality) {
      case ConnectionQuality.excellent:
        return 4;
      case ConnectionQuality.good:
        return 3;
      case ConnectionQuality.poor:
        return 2;
      case ConnectionQuality.none:
        return 0;
    }
  }
}

enum ConnectionQuality {
  none,
  poor,
  good,
  excellent,
}