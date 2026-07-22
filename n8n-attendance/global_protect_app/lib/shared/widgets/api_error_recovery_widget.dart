import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/services/api_error_recovery_service.dart';

class APIErrorRecoveryWidget extends StatelessWidget {
  final APIErrorDetails errorDetails;
  final VoidCallback? onRetry;
  final VoidCallback? onOfflineMode;
  final VoidCallback? onContactSupport;

  const APIErrorRecoveryWidget({
    Key? key,
    required this.errorDetails,
    this.onRetry,
    this.onOfflineMode,
    this.onContactSupport,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.all(16),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              children: [
                Icon(
                  _getErrorIcon(),
                  color: _getErrorColor(),
                  size: 24,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    _getErrorTitle(),
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      color: _getErrorColor(),
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              errorDetails.userFriendlyMessage,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            if (errorDetails.estimatedResolutionTime != null) ...[
              const SizedBox(height: 8),
              Text(
                'Estimated resolution time: ${_formatDuration(errorDetails.estimatedResolutionTime!)}',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Colors.grey[600],
                ),
              ),
            ],
            const SizedBox(height: 16),
            _buildActionButtons(context),
          ],
        ),
      ),
    );
  }

  Widget _buildActionButtons(BuildContext context) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        if (errorDetails.canRetry && onRetry != null)
          ElevatedButton.icon(
            onPressed: onRetry,
            icon: const Icon(Icons.refresh),
            label: const Text('Retry'),
          ),
        if (errorDetails.isTemporary && onOfflineMode != null)
          OutlinedButton.icon(
            onPressed: onOfflineMode,
            icon: const Icon(Icons.offline_bolt),
            label: const Text('Offline Mode'),
          ),
        OutlinedButton.icon(
          onPressed: () => _showSupportOptions(context),
          icon: const Icon(Icons.support_agent),
          label: const Text('Get Help'),
        ),
        TextButton.icon(
          onPressed: () => _showErrorReport(context),
          icon: const Icon(Icons.bug_report),
          label: const Text('Report Issue'),
        ),
      ],
    );
  }

  IconData _getErrorIcon() {
    switch (errorDetails.type) {
      case APIErrorType.networkTimeout:
        return Icons.wifi_off;
      case APIErrorType.serverError:
        return Icons.error;
      case APIErrorType.authenticationError:
        return Icons.lock;
      case APIErrorType.rateLimitError:
        return Icons.hourglass_empty;
      case APIErrorType.maintenanceError:
        return Icons.build;
      default:
        return Icons.warning;
    }
  }

  Color _getErrorColor() {
    if (errorDetails.isTemporary) {
      return Colors.orange;
    }
    return Colors.red;
  }

  String _getErrorTitle() {
    switch (errorDetails.type) {
      case APIErrorType.networkTimeout:
        return 'Connection Problem';
      case APIErrorType.serverError:
        return 'Server Error';
      case APIErrorType.authenticationError:
        return 'Authentication Required';
      case APIErrorType.rateLimitError:
        return 'Too Many Requests';
      case APIErrorType.maintenanceError:
        return 'Maintenance Mode';
      default:
        return 'Error Occurred';
    }
  }

  String _formatDuration(Duration duration) {
    if (duration.inMinutes < 60) {
      return '${duration.inMinutes} minutes';
    } else {
      final hours = duration.inHours;
      return '$hours hour${hours > 1 ? 's' : ''}';
    }
  }

  void _showSupportOptions(BuildContext context) {
    final supportInfo = APIErrorRecoveryService().getTechnicalSupportInfo();
    
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Technical Support'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ListTile(
              leading: const Icon(Icons.email),
              title: Text(supportInfo['email']!),
              subtitle: const Text('Email Support'),
              onTap: () => _launchEmail(supportInfo['email']!),
            ),
            ListTile(
              leading: const Icon(Icons.phone),
              title: Text(supportInfo['phone']!),
              subtitle: const Text('Phone Support'),
              onTap: () => _launchPhone(supportInfo['phone']!),
            ),
            ListTile(
              leading: const Icon(Icons.web),
              title: const Text('Support Website'),
              subtitle: Text(supportInfo['website']!),
              onTap: () => _launchUrl(supportInfo['website']!),
            ),
            const SizedBox(height: 8),
            Text(
              'Hours: ${supportInfo['hours']}',
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  void _showErrorReport(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Report Issue'),
        content: const Text(
          'Would you like to send an error report to help us improve the app?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.of(context).pop();
              if (onContactSupport != null) {
                onContactSupport!();
              }
            },
            child: const Text('Send Report'),
          ),
        ],
      ),
    );
  }

  void _launchEmail(String email) async {
    final uri = Uri.parse('mailto:$email');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    }
  }

  void _launchPhone(String phone) async {
    final uri = Uri.parse('tel:$phone');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    }
  }

  void _launchUrl(String url) async {
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    }
  }
}