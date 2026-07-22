import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../core/services/battery_optimization_service.dart';
import '../../../../core/services/network_optimization_service.dart';
import '../../../../core/services/background_task_optimization_service.dart';
import '../../../../shared/themes/colors.dart';

class BatteryStatsPage extends StatefulWidget {
  const BatteryStatsPage({super.key});

  @override
  State<BatteryStatsPage> createState() => _BatteryStatsPageState();
}

class _BatteryStatsPageState extends State<BatteryStatsPage> {
  final BatteryOptimizationService _batteryService = BatteryOptimizationService();
  final NetworkOptimizationService _networkService = NetworkOptimizationService();
  final BackgroundTaskOptimizationService _taskService = BackgroundTaskOptimizationService();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Battery Usage'),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          setState(() {});
        },
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildBatteryStatusCard(),
              const SizedBox(height: 16),
              _buildOptimizationStatusCard(),
              const SizedBox(height: 16),
              _buildUsageStatsCard(),
              const SizedBox(height: 16),
              _buildRecommendationsCard(),
              const SizedBox(height: 16),
              _buildNetworkStatsCard(),
              const SizedBox(height: 16),
              _buildBackgroundTasksCard(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildBatteryStatusCard() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Battery Status',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Level: ${_batteryService.batteryLevel}%',
                        style: Theme.of(context).textTheme.bodyLarge,
                      ),
                      const SizedBox(height: 8),
                      LinearProgressIndicator(
                        value: _batteryService.batteryLevel / 100,
                        backgroundColor: Colors.grey[300],
                        valueColor: AlwaysStoppedAnimation<Color>(
                          _getBatteryColor(_batteryService.batteryLevel),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 16),
                Icon(
                  _getBatteryIcon(),
                  size: 32,
                  color: _getBatteryColor(_batteryService.batteryLevel),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                _buildStatusChip(
                  'Power Saving',
                  _batteryService.isPowerSavingMode,
                ),
                const SizedBox(width: 8),
                _buildStatusChip(
                  'Low Battery',
                  _batteryService.isLowBatteryMode,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildOptimizationStatusCard() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Optimization Status',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 16),
            _buildOptimizationItem(
              'Location Services',
              _batteryService.shouldReduceLocationAccuracy() ? 'Optimized' : 'Normal',
              _batteryService.shouldReduceLocationAccuracy(),
            ),
            _buildOptimizationItem(
              'Network Requests',
              _batteryService.shouldReduceNetworkRequests() ? 'Batched' : 'Normal',
              _batteryService.shouldReduceNetworkRequests(),
            ),
            _buildOptimizationItem(
              'Background Tasks',
              _batteryService.shouldDisableBackgroundTasks() ? 'Disabled' : 'Active',
              _batteryService.shouldDisableBackgroundTasks(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildUsageStatsCard() {
    final stats = _batteryService.batteryUsageStats;
    
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Usage Statistics',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 16),
            if (stats.isEmpty)
              const Text('No usage data available')
            else
              ...stats.entries.map((entry) => Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(_formatActivityName(entry.key)),
                    Text('${entry.value} times'),
                  ],
                ),
              )),
          ],
        ),
      ),
    );
  }

  Widget _buildRecommendationsCard() {
    final recommendations = _batteryService.getBatteryOptimizationRecommendations();
    
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Recommendations',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 16),
            if (recommendations.isEmpty)
              const Text('No recommendations at this time')
            else
              ...recommendations.map((recommendation) => Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(
                      Icons.lightbulb_outline,
                      size: 16,
                      color: Colors.orange,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(recommendation),
                    ),
                  ],
                ),
              )),
          ],
        ),
      ),
    );
  }

  Widget _buildNetworkStatsCard() {
    final stats = _networkService.getNetworkStats();
    
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Network Optimization',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 16),
            _buildStatRow('Queued Requests', '${stats['queued_requests']}'),
            _buildStatRow('Cached Responses', '${stats['cached_responses']}'),
            _buildStatRow('Batch Processing', stats['is_batch_processing'] ? 'Active' : 'Idle'),
          ],
        ),
      ),
    );
  }

  Widget _buildBackgroundTasksCard() {
    final stats = _taskService.getTaskStats();
    
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Background Tasks',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 16),
            _buildStatRow('Active Tasks', '${stats['active_tasks']}'),
            _buildStatRow('Processing Enabled', stats['background_processing_enabled'] ? 'Yes' : 'No'),
            _buildStatRow('Active Isolates', '${stats['active_isolates']}'),
          ],
        ),
      ),
    );
  }

  Widget _buildOptimizationItem(String title, String status, bool isOptimized) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(title),
          Row(
            children: [
              Text(
                status,
                style: TextStyle(
                  color: isOptimized ? Colors.green : Colors.grey,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(width: 8),
              Icon(
                isOptimized ? Icons.eco : Icons.circle,
                size: 16,
                color: isOptimized ? Colors.green : Colors.grey,
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStatRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label),
          Text(
            value,
            style: const TextStyle(fontWeight: FontWeight.w500),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusChip(String label, bool isActive) {
    return Chip(
      label: Text(
        label,
        style: TextStyle(
          color: isActive ? Colors.white : Colors.grey[600],
          fontSize: 12,
        ),
      ),
      backgroundColor: isActive ? Colors.orange : Colors.grey[200],
      padding: const EdgeInsets.symmetric(horizontal: 8),
    );
  }

  Color _getBatteryColor(int level) {
    if (level <= 20) return Colors.red;
    if (level <= 50) return Colors.orange;
    return Colors.green;
  }

  IconData _getBatteryIcon() {
    final level = _batteryService.batteryLevel;
    if (level <= 20) return Icons.battery_1_bar;
    if (level <= 40) return Icons.battery_2_bar;
    if (level <= 60) return Icons.battery_4_bar;
    if (level <= 80) return Icons.battery_5_bar;
    return Icons.battery_full;
  }

  String _formatActivityName(String activityName) {
    return activityName
        .replaceAll('_', ' ')
        .split(' ')
        .map((word) => word[0].toUpperCase() + word.substring(1))
        .join(' ');
  }
}