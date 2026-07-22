import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:global_protect_app/features/clock_in/presentation/bloc/reminder/reminder_event.dart';
import 'package:global_protect_app/features/clock_in/presentation/bloc/reminder/reminder_state.dart';
import '../bloc/reminder/reminder_bloc.dart';
import '../../domain/entities/reminder.dart';

class ReminderSettingsPage extends StatefulWidget {
  const ReminderSettingsPage({Key? key}) : super(key: key);

  @override
  State<ReminderSettingsPage> createState() => _ReminderSettingsPageState();
}

class _ReminderSettingsPageState extends State<ReminderSettingsPage> {
  bool _remindersEnabled = true;
  bool _smartRemindersEnabled = true;
  bool _respectDndEnabled = true;
  ReminderType _defaultReminderType = ReminderType.notification;
  TimeOfDay _defaultReminderTime = const TimeOfDay(hour: 17, minute: 0);

  @override
  void initState() {
    super.initState();
    context.read<ReminderBloc>().add(LoadReminderSettingsEvent());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Reminder Settings'),
        backgroundColor: Theme.of(context).primaryColor,
      ),
      body: BlocConsumer<ReminderBloc, ReminderState>(
        listener: (context, state) {
          if (state is ReminderError) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(state.message)),
            );
          }
        },
        builder: (context, state) {
          if (state is ReminderLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          return SingleChildScrollView(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildGeneralSettings(),
                const SizedBox(height: 24),
                _buildReminderTypeSettings(),
                const SizedBox(height: 24),
                _buildSmartReminderSettings(),
                const SizedBox(height: 24),
                _buildNotificationSettings(),
                const SizedBox(height: 32),
                _buildActionButtons(),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildGeneralSettings() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'General Settings',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 16),
            SwitchListTile(
              title: const Text('Enable Reminders'),
              subtitle: const Text('Turn on/off all clock-out reminders'),
              value: _remindersEnabled,
              onChanged: (value) {
                setState(() {
                  _remindersEnabled = value;
                });
              },
            ),
            ListTile(
              title: const Text('Default Reminder Time'),
              subtitle: Text(_defaultReminderTime.format(context)),
              trailing: const Icon(Icons.access_time),
              onTap: _selectDefaultTime,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildReminderTypeSettings() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Reminder Type',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 16),
            ...ReminderType.values.map((type) => RadioListTile<ReminderType>(
                  title: Text(_getReminderTypeLabel(type)),
                  subtitle: Text(_getReminderTypeDescription(type)),
                  value: type,
                  groupValue: _defaultReminderType,
                  onChanged: (value) {
                    setState(() {
                      _defaultReminderType = value!;
                    });
                  },
                )),
          ],
        ),
      ),
    );
  }

  Widget _buildSmartReminderSettings() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Smart Reminders',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 16),
            SwitchListTile(
              title: const Text('Enable Smart Reminders'),
              subtitle: const Text(
                  'AI-powered reminders based on your work patterns'),
              value: _smartRemindersEnabled,
              onChanged: (value) {
                setState(() {
                  _smartRemindersEnabled = value;
                });
              },
            ),
            if (_smartRemindersEnabled) ...[
              const Divider(),
              ListTile(
                title: const Text('Analyze Work Patterns'),
                subtitle: const Text('Update smart reminder suggestions'),
                trailing: const Icon(Icons.analytics),
                onTap: () {
                  context.read<ReminderBloc>().add(AnalyzeWorkPatternsEvent());
                },
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildNotificationSettings() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Notification Settings',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 16),
            SwitchListTile(
              title: const Text('Respect Do Not Disturb'),
              subtitle: const Text('Skip reminders when DND is active'),
              value: _respectDndEnabled,
              onChanged: (value) {
                setState(() {
                  _respectDndEnabled = value;
                });
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActionButtons() {
    return Row(
      children: [
        Expanded(
          child: ElevatedButton(
            onPressed: _saveSettings,
            child: const Text('Save Settings'),
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: OutlinedButton(
            onPressed: _testReminder,
            child: const Text('Test Reminder'),
          ),
        ),
      ],
    );
  }

  void _selectDefaultTime() async {
    final TimeOfDay? picked = await showTimePicker(
      context: context,
      initialTime: _defaultReminderTime,
    );
    if (picked != null) {
      setState(() {
        _defaultReminderTime = picked;
      });
    }
  }

  String _getReminderTypeLabel(ReminderType type) {
    switch (type) {
      case ReminderType.notification:
        return 'Notification';
      case ReminderType.alarm:
        return 'Alarm';
      case ReminderType.vibration:
        return 'Vibration Only';
      case ReminderType.silent:
        return 'Silent';
      default:
        return 'Silent';
    }
  }

  String _getReminderTypeDescription(ReminderType type) {
    switch (type) {
      case ReminderType.notification:
        return 'Standard notification with sound';
      case ReminderType.alarm:
        return 'Full-screen alarm with actions';
      case ReminderType.vibration:
        return 'Vibration without sound';
      case ReminderType.silent:
        return 'Silent notification only';
      default:
        return 'Silent notification only';
    }
  }

  void _saveSettings() {
    context.read<ReminderBloc>().add(
          SaveReminderSettingsEvent(
            enabled: _remindersEnabled,
            smartEnabled: _smartRemindersEnabled,
            respectDnd: _respectDndEnabled,
            defaultType: _defaultReminderType,
            defaultTime: _defaultReminderTime,
          ),
        );
  }

  void _testReminder() {
    context.read<ReminderBloc>().add(TestReminderEvent());
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Test reminder sent!')),
    );
  }
}
