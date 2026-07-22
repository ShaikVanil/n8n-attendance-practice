import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../domain/entities/notification_preferences.dart';
import '../bloc/notification_bloc.dart';
import '../bloc/notification_event.dart';
import '../bloc/notification_state.dart';

class NotificationPreferencesPage extends StatefulWidget {
  const NotificationPreferencesPage({super.key});

  @override
  State<NotificationPreferencesPage> createState() => _NotificationPreferencesPageState();
}

class _NotificationPreferencesPageState extends State<NotificationPreferencesPage> {
  @override
  void initState() {
    super.initState();
    context.read<NotificationBloc>().add(LoadNotificationPreferencesEvent());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Notification Preferences'),
      ),
      body: BlocBuilder<NotificationBloc, NotificationState>(
        builder: (context, state) {
          if (state is NotificationLoading) {
            return const Center(child: CircularProgressIndicator());
          }
          
          if (state is NotificationError) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.error_outline,
                    size: 64,
                    color: Theme.of(context).colorScheme.error,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Error loading preferences',
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    state.message,
                    style: Theme.of(context).textTheme.bodyMedium,
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () {
                      context.read<NotificationBloc>().add(LoadNotificationPreferencesEvent());
                    },
                    child: const Text('Retry'),
                  ),
                ],
              ),
            );
          }
          
          if (state is NotificationsLoaded || state is NotificationPreferencesUpdated) {
            final preferences = state is NotificationsLoaded 
                ? state.preferences 
                : (state as NotificationPreferencesUpdated).preferences;
                
            return _PreferencesForm(preferences: preferences);
          }
          
          return const SizedBox.shrink();
        },
      ),
    );
  }
}

class _PreferencesForm extends StatefulWidget {
  final NotificationPreferences preferences;

  const _PreferencesForm({required this.preferences});

  @override
  State<_PreferencesForm> createState() => _PreferencesFormState();
}

class _PreferencesFormState extends State<_PreferencesForm> {
  late NotificationPreferences _preferences;

  @override
  void initState() {
    super.initState();
    _preferences = widget.preferences;
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _buildSection(
          title: 'General Settings',
          children: [
            SwitchListTile(
              title: const Text('Enable Notifications'),
              subtitle: const Text('Turn on/off all notifications'),
              value: _preferences.enableNotifications,
              onChanged: (value) {
                setState(() {
                  _preferences = _preferences.copyWith(enableNotifications: value);
                });
                _updatePreferences();
              },
            ),
            SwitchListTile(
              title: const Text('Respect Do Not Disturb'),
              subtitle: const Text('Honor system DND settings'),
              value: _preferences.respectDoNotDisturb,
              onChanged: _preferences.enableNotifications ? (value) {
                setState(() {
                  _preferences = _preferences.copyWith(respectDoNotDisturb: value);
                });
                _updatePreferences();
              } : null,
            ),
          ],
        ),
        const SizedBox(height: 24),
        _buildSection(
          title: 'Notification Types',
          children: [
            SwitchListTile(
              title: const Text('Success Notifications'),
              subtitle: const Text('Clock-in/out success messages'),
              value: _preferences.enableSuccessNotifications,
              onChanged: _preferences.enableNotifications ? (value) {
                setState(() {
                  _preferences = _preferences.copyWith(enableSuccessNotifications: value);
                });
                _updatePreferences();
              } : null,
            ),
            SwitchListTile(
              title: const Text('Error Notifications'),
              subtitle: const Text('Failed attempts and errors'),
              value: _preferences.enableErrorNotifications,
              onChanged: _preferences.enableNotifications ? (value) {
                setState(() {
                  _preferences = _preferences.copyWith(enableErrorNotifications: value);
                });
                _updatePreferences();
              } : null,
            ),
            SwitchListTile(
              title: const Text('Sync Notifications'),
              subtitle: const Text('Data synchronization status'),
              value: _preferences.enableSyncNotifications,
              onChanged: _preferences.enableNotifications ? (value) {
                setState(() {
                  _preferences = _preferences.copyWith(enableSyncNotifications: value);
                });
                _updatePreferences();
              } : null,
            ),
          ],
        ),
        const SizedBox(height: 24),
        _buildSection(
          title: 'Notification Features',
          children: [
            SwitchListTile(
              title: const Text('Rich Notifications'),
              subtitle: const Text('Quick actions in notifications'),
              value: _preferences.enableRichNotifications,
              onChanged: _preferences.enableNotifications ? (value) {
                setState(() {
                  _preferences = _preferences.copyWith(enableRichNotifications: value);
                });
                _updatePreferences();
              } : null,
            ),
            SwitchListTile(
              title: const Text('Sound'),
              subtitle: const Text('Play notification sounds'),
              value: _preferences.enableSound,
              onChanged: _preferences.enableNotifications ? (value) {
                setState(() {
                  _preferences = _preferences.copyWith(enableSound: value);
                });
                _updatePreferences();
              } : null,
            ),
            SwitchListTile(
              title: const Text('Vibration'),
              subtitle: const Text('Vibrate on notifications'),
              value: _preferences.enableVibration,
              onChanged: _preferences.enableNotifications ? (value) {
                setState(() {
                  _preferences = _preferences.copyWith(enableVibration: value);
                });
                _updatePreferences();
              } : null,
            ),
          ],
        ),
        const SizedBox(height: 24),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Test Notifications',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 8),
                Text(
                  'Send test notifications to verify your settings',
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
                const SizedBox(height: 16),
                Wrap(
                  spacing: 8,
                  children: [
                    ElevatedButton(
                      onPressed: () => _sendTestNotification('success'),
                      child: const Text('Test Success'),
                    ),
                    ElevatedButton(
                      onPressed: () => _sendTestNotification('error'),
                      child: const Text('Test Error'),
                    ),
                    ElevatedButton(
                      onPressed: () => _sendTestNotification('sync'),
                      child: const Text('Test Sync'),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
  
  Widget _buildSection({
    required String title,
    required List<Widget> children,
  }) {
    return Card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
            child: Text(
              title,
              style: Theme.of(context).textTheme.titleMedium,
            ),
          ),
          ...children,
        ],
      ),
    );
  }
  
  void _updatePreferences() {
    context.read<NotificationBloc>().add(
      UpdateNotificationPreferencesEvent(_preferences),
    );
  }
  
  void _sendTestNotification(String type) {
    // This would typically call the notification service directly
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Test $type notification sent'),
        duration: const Duration(seconds: 2),
      ),
    );
  }
}