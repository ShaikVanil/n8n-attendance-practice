import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

class LocationPermissionExplanationWidget extends StatelessWidget {
  final VoidCallback onRequestPermission;
  final VoidCallback onOpenSettings;
  
  const LocationPermissionExplanationWidget({
    super.key,
    required this.onRequestPermission,
    required this.onOpenSettings,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.all(16),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  Icons.location_on,
                  color: Theme.of(context).primaryColor,
                  size: 28,
                ),
                const SizedBox(width: 12),
                const Expanded(
                  child: Text(
                    'Location Permission Required',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),
            
            // Why we need location
            _buildExplanationSection(
              icon: Icons.work,
              title: 'Why do we need your location?',
              description: 'We use your location to automatically verify that you are at the office when clocking in. This ensures accurate attendance tracking and prevents remote clock-ins.',
            ),
            
            const SizedBox(height: 16),
            
            // Benefits
            _buildExplanationSection(
              icon: Icons.check_circle,
              title: 'Benefits of location-based clock-in:',
              description: '• Automatic verification when you arrive at work\n• No need to remember to clock in manually\n• Accurate attendance records\n• Prevents accidental remote clock-ins',
            ),
            
            const SizedBox(height: 16),
            
            // Privacy information
            _buildExplanationSection(
              icon: Icons.privacy_tip,
              title: 'Your privacy matters',
              description: 'Your location data is only used for attendance verification and is not stored permanently or shared with third parties.',
            ),
            
            const SizedBox(height: 24),
            
            // Permission options
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.blue.shade50,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.blue.shade200),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Permission Options:',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    '• "While using app" - Recommended for clock-in functionality\n• "Always" - Enables background location features (optional)',
                    style: TextStyle(fontSize: 14),
                  ),
                ],
              ),
            ),
            
            const SizedBox(height: 24),
            
            // Action buttons
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: onRequestPermission,
                    icon: const Icon(Icons.location_on),
                    label: const Text('Grant Permission'),
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                  ),
                ),
              ],
            ),
            
            const SizedBox(height: 12),
            
            // Settings and privacy policy links
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                TextButton.icon(
                  onPressed: onOpenSettings,
                  icon: const Icon(Icons.settings, size: 18),
                  label: const Text('Open Settings'),
                ),
                TextButton.icon(
                  onPressed: _openPrivacyPolicy,
                  icon: const Icon(Icons.policy, size: 18),
                  label: const Text('Privacy Policy'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
  
  Widget _buildExplanationSection({
    required IconData icon,
    required String title,
    required String description,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(
          icon,
          color: Colors.blue.shade600,
          size: 20,
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontWeight: FontWeight.w600,
                  fontSize: 15,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                description,
                style: TextStyle(
                  color: Colors.grey.shade700,
                  fontSize: 14,
                  height: 1.4,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
  
  Future<void> _openPrivacyPolicy() async {
    const url = 'https://your-company.com/privacy-policy';
    if (await canLaunchUrl(Uri.parse(url))) {
      await launchUrl(Uri.parse(url));
    }
  }
}