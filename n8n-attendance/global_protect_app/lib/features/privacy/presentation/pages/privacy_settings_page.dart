import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:global_protect_app/features/privacy/presentation/bloc/privacy_event.dart';
import 'package:global_protect_app/features/privacy/presentation/bloc/privacy_state.dart';
import '../bloc/privacy_bloc.dart';
import 'privacy_policy_page.dart';
import 'data_viewer_page.dart';

class PrivacySettingsPage extends StatelessWidget {
  const PrivacySettingsPage({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Privacy Settings'),
        backgroundColor: Theme.of(context).primaryColor,
        foregroundColor: Colors.white,
      ),
      body: BlocBuilder<PrivacyBloc, PrivacyState>(
        builder: (context, state) {
          if (state is PrivacyLoading) {
            return const Center(child: CircularProgressIndicator());
          }
          
          if (state is PrivacyLoaded) {
            return ListView(
              padding: const EdgeInsets.all(16.0),
              children: [
                _buildSectionHeader('Location Privacy'),
                _buildSwitchTile(
                  context,
                  'Limit location sharing to work hours',
                  'Only collect location data during scheduled work hours',
                  state.settings.limitLocationToWorkHours,
                  (value) => context.read<PrivacyBloc>().add(
                    UpdateLocationSharingEvent(limitToWorkHours: value),
                  ),
                ),
                _buildSwitchTile(
                  context,
                  'High accuracy location',
                  'Use GPS for more precise location tracking',
                  state.settings.useHighAccuracyLocation,
                  (value) => context.read<PrivacyBloc>().add(
                    UpdateLocationAccuracyEvent(useHighAccuracy: value),
                  ),
                ),
                const Divider(height: 32),
                
                _buildSectionHeader('Data Management'),
                _buildActionTile(
                  context,
                  'View my data',
                  'See what data we have collected about you',
                  Icons.visibility,
                  () => Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const DataViewerPage()),
                  ),
                ),
                _buildActionTile(
                  context,
                  'Privacy policy',
                  'Read our complete privacy policy',
                  Icons.policy,
                  () => Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const PrivacyPolicyPage()),
                  ),
                ),
                _buildActionTile(
                  context,
                  'Request data deletion',
                  'Request deletion of your personal data',
                  Icons.delete_forever,
                  () => _showDataDeletionDialog(context),
                  isDestructive: true,
                ),
                const Divider(height: 32),
                
                _buildSectionHeader('Data Retention'),
                _buildInfoTile(
                  'Location data retention',
                  'Location data is automatically deleted after 90 days',
                ),
                _buildInfoTile(
                  'Attendance records',
                  'Attendance records are kept for 7 years for compliance',
                ),
              ],
            );
          }
          
          return const Center(child: Text('Error loading privacy settings'));
        },
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16.0, top: 8.0),
      child: Text(
        title,
        style: const TextStyle(
          fontSize: 18,
          fontWeight: FontWeight.bold,
          color: Colors.black87,
        ),
      ),
    );
  }

  Widget _buildSwitchTile(
    BuildContext context,
    String title,
    String subtitle,
    bool value,
    Function(bool) onChanged,
  ) {
    return SwitchListTile(
      title: Text(title),
      subtitle: Text(subtitle),
      value: value,
      onChanged: onChanged,
      activeColor: Theme.of(context).primaryColor,
    );
  }

  Widget _buildActionTile(
    BuildContext context,
    String title,
    String subtitle,
    IconData icon,
    VoidCallback onTap, {
    bool isDestructive = false,
  }) {
    return ListTile(
      leading: Icon(
        icon,
        color: isDestructive ? Colors.red : Theme.of(context).primaryColor,
      ),
      title: Text(
        title,
        style: TextStyle(
          color: isDestructive ? Colors.red : null,
        ),
      ),
      subtitle: Text(subtitle),
      trailing: const Icon(Icons.chevron_right),
      onTap: onTap,
    );
  }

  Widget _buildInfoTile(String title, String subtitle) {
    return ListTile(
      leading: const Icon(Icons.info_outline),
      title: Text(title),
      subtitle: Text(subtitle),
    );
  }

  void _showDataDeletionDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: const Text('Request Data Deletion'),
          content: const Text(
            'This will request deletion of all your personal data. Your attendance records may be retained for compliance purposes. This action cannot be undone.\n\nAre you sure you want to proceed?',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            TextButton(
              onPressed: () {
                Navigator.pop(context);
                context.read<PrivacyBloc>().add(RequestDataDeletionEvent());
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Data deletion request submitted'),
                  ),
                );
              },
              style: TextButton.styleFrom(foregroundColor: Colors.red),
              child: const Text('Delete My Data'),
            ),
          ],
        );
      },
    );
  }
}