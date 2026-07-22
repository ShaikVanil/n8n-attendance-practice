import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:global_protect_app/features/privacy/presentation/bloc/privacy_event.dart';
import 'package:global_protect_app/features/privacy/presentation/bloc/privacy_state.dart';
import 'package:intl/intl.dart';
import '../bloc/privacy_bloc.dart';
import '../../domain/entities/user_data.dart';

class DataViewerPage extends StatefulWidget {
  const DataViewerPage({Key? key}) : super(key: key);

  @override
  State<DataViewerPage> createState() => _DataViewerPageState();
}

class _DataViewerPageState extends State<DataViewerPage>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    context.read<PrivacyBloc>().add(LoadUserDataEvent());
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Data'),
        backgroundColor: Theme.of(context).primaryColor,
        foregroundColor: Colors.white,
        bottom: TabBar(
          controller: _tabController,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white70,
          tabs: const [
            Tab(text: 'Location Data'),
            Tab(text: 'Attendance Data'),
          ],
        ),
      ),
      body: BlocBuilder<PrivacyBloc, PrivacyState>(
        builder: (context, state) {
          if (state is PrivacyLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (state is UserDataLoaded) {
            return TabBarView(
              controller: _tabController,
              children: [
                _buildLocationDataTab(state.userData),
                _buildAttendanceDataTab(state.userData),
              ],
            );
          }

          if (state is PrivacyError) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.error_outline,
                    size: 64,
                    color: Colors.red[300],
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Error loading data',
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
                      context.read<PrivacyBloc>().add(LoadUserDataEvent());
                    },
                    child: const Text('Retry'),
                  ),
                ],
              ),
            );
          }

          return const Center(
            child: Text('No data available'),
          );
        },
      ),
    );
  }

  Widget _buildLocationDataTab(UserData userData) {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(16),
          color: Colors.blue[50],
          child: Row(
            children: [
              Icon(Icons.info_outline, color: Colors.blue[700]),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Total location points: ${userData.locationHistory.length}',
                  style: TextStyle(color: Colors.blue[700]),
                ),
              ),
            ],
          ),
        ),
        Expanded(
          child: ListView.builder(
            itemCount: userData.locationHistory.length,
            itemBuilder: (context, index) {
              final location = userData.locationHistory[index];
              return Card(
                margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                child: ListTile(
                  leading: CircleAvatar(
                    backgroundColor: location.purpose == 'clock_in'
                        ? Colors.green
                        : Colors.orange,
                    child: Icon(
                      location.purpose == 'clock_in'
                          ? Icons.login
                          : Icons.logout,
                      color: Colors.white,
                    ),
                  ),
                  title: Text(
                    '${location.purpose.replaceAll('_', ' ').toUpperCase()}',
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                  subtitle: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Lat: ${location.latitude.toStringAsFixed(6)}',
                      ),
                      Text(
                        'Lng: ${location.longitude.toStringAsFixed(6)}',
                      ),
                      Text(
                        DateFormat('MMM dd, yyyy - HH:mm')
                            .format(location.timestamp),
                        style: TextStyle(color: Colors.grey[600]),
                      ),
                    ],
                  ),
                  trailing: IconButton(
                    icon: const Icon(Icons.map),
                    onPressed: () {
                      // TODO: Open map view
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Map view coming soon'),
                        ),
                      );
                    },
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildAttendanceDataTab(UserData userData) {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(16),
          color: Colors.green[50],
          child: Row(
            children: [
              Icon(Icons.info_outline, color: Colors.green[700]),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Total attendance records: ${userData.attendanceHistory.length}',
                  style: TextStyle(color: Colors.green[700]),
                ),
              ),
            ],
          ),
        ),
        Expanded(
          child: ListView.builder(
            itemCount: userData.attendanceHistory.length,
            itemBuilder: (context, index) {
              final attendance = userData.attendanceHistory[index];
              final duration = attendance.clockOut != null
                  ? attendance.clockOut!.difference(attendance.clockIn)
                  : null;

              return Card(
                margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                child: ListTile(
                  leading: CircleAvatar(
                    backgroundColor: attendance.status == 'completed'
                        ? Colors.green
                        : Colors.orange,
                    child: Icon(
                      attendance.status == 'completed'
                          ? Icons.check
                          : Icons.access_time,
                      color: Colors.white,
                    ),
                  ),
                  title: Text(
                    DateFormat('MMM dd, yyyy').format(attendance.clockIn),
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                  subtitle: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Clock In: ${DateFormat('HH:mm').format(attendance.clockIn)}',
                      ),
                      if (attendance.clockOut != null)
                        Text(
                          'Clock Out: ${DateFormat('HH:mm').format(attendance.clockOut!)}',
                        ),
                      if (duration != null)
                        Text(
                          'Duration: ${duration.inHours}h ${duration.inMinutes % 60}m',
                          style: TextStyle(
                            color: Colors.blue[600],
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      Text(
                        'Status: ${attendance.status}',
                        style: TextStyle(
                          color: attendance.status == 'completed'
                              ? Colors.green[600]
                              : Colors.orange[600],
                        ),
                      ),
                      if (attendance.notes != null)
                        Text(
                          'Notes: ${attendance.notes}',
                          style: TextStyle(color: Colors.grey[600]),
                        ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}