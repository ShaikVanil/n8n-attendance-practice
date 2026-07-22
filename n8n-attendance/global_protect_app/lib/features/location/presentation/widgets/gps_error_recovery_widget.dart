import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../core/services/gps_error_recovery_service.dart';
import '../bloc/location_bloc.dart';
import '../bloc/location_event.dart';
import '../bloc/location_state.dart';

class GPSErrorRecoveryWidget extends StatelessWidget {
  const GPSErrorRecoveryWidget({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<LocationBloc, LocationState>(
      builder: (context, state) {
        if (state is LocationGPSError) {
          return _buildGPSErrorCard(context, state);
        } else if (state is LocationRetrying) {
          return _buildRetryingCard(context, state);
        } else if (state is LocationFallbackAvailable) {
          return _buildFallbackCard(context, state);
        } else if (state is LocationManualOverrideRequired) {
          return _buildManualOverrideCard(context, state);
        }
        return const SizedBox.shrink();
      },
    );
  }

  Widget _buildGPSErrorCard(BuildContext context, LocationGPSError state) {
    return Card(
      margin: const EdgeInsets.all(16),
      color: Colors.orange.shade50,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  Icons.gps_off,
                  color: Colors.orange.shade700,
                  size: 32,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'GPS Issue Detected',
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          color: Colors.orange.shade700,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        state.errorDetails.userFriendlyMessage,
                        style: TextStyle(color: Colors.orange.shade600),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            
            // Improvement suggestions
            Text(
              'Try these solutions:',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 8),
            ...state.errorDetails.suggestions.map((suggestion) => 
              Padding(
                padding: const EdgeInsets.only(bottom: 4),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(
                      Icons.check_circle_outline,
                      size: 16,
                      color: Colors.green.shade600,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        suggestion,
                        style: const TextStyle(fontSize: 14),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            
            const SizedBox(height: 16),
            
            // Action buttons
            Row(
              children: [
                if (state.canRetry) ...[
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () {
                        context.read<LocationBloc>().add(
                          const RetryLocationEvent(),
                        );
                      },
                      icon: const Icon(Icons.refresh),
                      label: Text('Retry (${state.attemptCount}/5)'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.blue,
                        foregroundColor: Colors.white,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                ],
                
                if (state.hasAlternativeMethod) ...[
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () {
                        context.read<LocationBloc>().add(
                          const RetryLocationEvent(useAlternativeMethod: true),
                        );
                      },
                      icon: const Icon(Icons.wifi),
                      label: const Text('Use WiFi'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: Colors.green.shade700,
                      ),
                    ),
                  ),
                ],
              ],
            ),
            
            const SizedBox(height: 8),
            
            // Manual override option
            if (GPSErrorRecoveryService.shouldOfferManualOverride(
              state.errorDetails.type, 
              state.attemptCount,
            ))
              SizedBox(
                width: double.infinity,
                child: TextButton.icon(
                  onPressed: () {
                    context.read<LocationBloc>().add(
                      RequestManualOverrideEvent(
                        reason: 'GPS unavailable after ${state.attemptCount} attempts',
                      ),
                    );
                  },
                  icon: const Icon(Icons.support_agent),
                  label: const Text('Request Manual Override'),
                  style: TextButton.styleFrom(
                    foregroundColor: Colors.orange.shade700,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildRetryingCard(BuildContext context, LocationRetrying state) {
    return Card(
      margin: const EdgeInsets.all(16),
      color: Colors.blue.shade50,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            SizedBox(
              width: 24,
              height: 24,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                valueColor: AlwaysStoppedAnimation(Colors.blue.shade600),
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Retrying GPS Location',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  Text(
                    'Attempt ${state.attemptNumber} of ${state.maxAttempts}',
                    style: TextStyle(color: Colors.grey.shade600),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFallbackCard(BuildContext context, LocationFallbackAvailable state) {
    return Card(
      margin: const EdgeInsets.all(16),
      color: Colors.green.shade50,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  Icons.wifi,
                  color: Colors.green.shade700,
                  size: 32,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Alternative Method Available',
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          color: Colors.green.shade700,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        state.message,
                        style: TextStyle(color: Colors.green.shade600),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            
            ...state.instructions.map((instruction) => 
              Padding(
                padding: const EdgeInsets.only(bottom: 4),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(
                      Icons.info_outline,
                      size: 16,
                      color: Colors.blue.shade600,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        instruction,
                        style: const TextStyle(fontSize: 14),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            
            const SizedBox(height: 16),
            
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () {
                  context.read<LocationBloc>().add(const FallbackToWiFiEvent());
                },
                icon: const Icon(Icons.wifi),
                label: Text('Use ${state.fallbackMethod} Location'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.green,
                  foregroundColor: Colors.white,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildManualOverrideCard(BuildContext context, LocationManualOverrideRequired state) {
    return Card(
      margin: const EdgeInsets.all(16),
      color: Colors.amber.shade50,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  Icons.support_agent,
                  color: Colors.amber.shade700,
                  size: 32,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Manual Override Required',
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          color: Colors.amber.shade700,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        state.reason,
                        style: TextStyle(color: Colors.amber.shade600),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            
            ...state.instructions.map((instruction) => 
              Padding(
                padding: const EdgeInsets.only(bottom: 4),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(
                      Icons.info_outline,
                      size: 16,
                      color: Colors.blue.shade600,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        instruction,
                        style: const TextStyle(fontSize: 14),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            
            const SizedBox(height: 16),
            
            // Support contact information
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.grey.shade100,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Technical Support',
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 8),
                  ...state.supportInfo.entries.map((entry) => 
                    Padding(
                      padding: const EdgeInsets.only(bottom: 2),
                      child: Text(
                        '${entry.key}: ${entry.value}',
                        style: const TextStyle(fontSize: 12),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            
            const SizedBox(height: 16),
            
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () {
                      // Open email client or support chat
                      context.read<LocationBloc>().add(
                        ContactTechnicalSupportEvent(
                          issueDescription: 'GPS location failure requiring manual override',
                          diagnosticInfo: {
                            'timestamp': DateTime.now().toIso8601String(),
                            'reason': state.reason,
                          },
                        ),
                      );
                    },
                    icon: const Icon(Icons.email),
                    label: const Text('Contact Support'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () {
                      context.read<LocationBloc>().add(
                        RequestManualOverrideEvent(
                          reason: state.reason,
                        ),
                      );
                    },
                    icon: const Icon(Icons.assignment),
                    label: const Text('Request Override'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.amber.shade600,
                      foregroundColor: Colors.white,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}