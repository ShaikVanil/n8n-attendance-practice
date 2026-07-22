import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:global_protect_app/features/clock_in/presentation/bloc/attendance/attendance_bloc.dart';
import 'package:global_protect_app/features/clock_in/presentation/bloc/attendance/attendance_event.dart';
import 'package:global_protect_app/features/clock_in/presentation/bloc/attendance/attendance_state.dart';

class OfflineStatusWidget extends StatelessWidget {
  const OfflineStatusWidget({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<AttendanceBloc, AttendanceState>(
      builder: (context, state) {
        if (state is AttendanceOfflineMode) {
          return _buildOfflineCard(context, state);
        } else if (state is AttendanceSyncing) {
          return _buildSyncingCard(context, state);
        } else if (state is AttendanceSyncCompleted) {
          return _buildSyncCompletedCard(context, state);
        } else if (state is AttendanceLoaded && state.pendingOfflineRequests > 0) {
          return _buildPendingRequestsCard(context, state);
        }
        return const SizedBox.shrink();
      },
    );
  }

  Widget _buildOfflineCard(BuildContext context, AttendanceOfflineMode state) {
    return Card(
      color: Colors.orange.shade50,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.cloud_off, color: Colors.orange.shade700),
                const SizedBox(width: 8),
                Text(
                  'Offline Mode',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    color: Colors.orange.shade700,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(state.message),
            if (state.queuedRequests > 0) ...[
              const SizedBox(height: 8),
              Text(
                '${state.queuedRequests} request(s) queued for sync',
                style: const TextStyle(fontWeight: FontWeight.w500),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildSyncingCard(BuildContext context, AttendanceSyncing state) {
    final progress = state.totalRequests > 0 
        ? state.syncedRequests / state.totalRequests 
        : 0.0;

    return Card(
      color: Colors.blue.shade50,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    value: progress,
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  'Syncing...',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    color: Colors.blue.shade700,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text('${state.syncedRequests}/${state.totalRequests} requests synced'),
            const SizedBox(height: 8),
            LinearProgressIndicator(value: progress),
          ],
        ),
      ),
    );
  }

  Widget _buildSyncCompletedCard(BuildContext context, AttendanceSyncCompleted state) {
    final isSuccess = state.result.success;
    final color = isSuccess ? Colors.green : Colors.red;

    return Card(
      color: color.shade50,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  isSuccess ? Icons.check_circle : Icons.error,
                  color: color.shade700,
                ),
                const SizedBox(width: 8),
                Text(
                  isSuccess ? 'Sync Completed' : 'Sync Failed',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    color: color.shade700,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(state.result.message),
            if (!isSuccess) ...[
              const SizedBox(height: 8),
              ElevatedButton(
                onPressed: () {
                  context.read<AttendanceBloc>().add(SyncOfflineRequestsEvent());
                },
                child: const Text('Retry Sync'),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildPendingRequestsCard(BuildContext context, AttendanceLoaded state) {
    return Card(
      color: Colors.amber.shade50,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Row(
          children: [
            Icon(Icons.sync, color: Colors.amber.shade700),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                '${state.pendingOfflineRequests} pending request(s) will sync automatically',
                style: TextStyle(color: Colors.amber.shade700),
              ),
            ),
            TextButton(
              onPressed: () {
                context.read<AttendanceBloc>().add(SyncOfflineRequestsEvent());
              },
              child: const Text('Sync Now'),
            ),
          ],
        ),
      ),
    );
  }
}