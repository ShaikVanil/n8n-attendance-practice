import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:global_protect_app/features/clock_in/presentation/bloc/attendance/attendance_event.dart';
import 'package:global_protect_app/features/location/domain/entities/location.dart';
import 'package:global_protect_app/features/location/presentation/bloc/location_event.dart';
import 'package:global_protect_app/features/clock_in/presentation/bloc/wifi/wifi_event.dart';
import 'package:global_protect_app/features/location/presentation/widgets/enhanced_location_status_widget.dart';
import 'package:intl/intl.dart';
import '../../../authentication/presentation/widgets/logout_button.dart';
import '../../../authentication/presentation/widgets/token_refresh_indicator.dart';
import '../../../clock_in/presentation/bloc/attendance/attendance_bloc.dart';
import '../../../clock_in/presentation/bloc/attendance/attendance_state.dart';
import '../../../location/presentation/bloc/location_bloc.dart';
import '../../../location/presentation/bloc/location_state.dart';
import '../../../clock_in/presentation/bloc/wifi/wifi_bloc.dart';
import '../../../clock_in/presentation/bloc/wifi/wifi_state.dart';
import '../../../../shared/themes/colors.dart';
import 'package:geolocator/geolocator.dart';
import '../../../clock_in/presentation/widgets/clock_out_confirmation_dialog.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  bool _isInitializing = false;

  @override
  void initState() {
    super.initState();
    _initializeDataSequentially();
  }

  Future<void> _initializeDataSequentially() async {
    if (_isInitializing) return;
    _isInitializing = true;

    try {
      // Step 1: Initialize location first
      context.read<LocationBloc>().add(GetCurrentLocationEvent());
      
      // Step 2: Wait for location to be loaded, then get other data
      await _waitForLocationAndContinue();
      
      // Step 3: Initialize other blocs
      context.read<AttendanceBloc>().add(GetCurrentAttendanceEvent());
      context.read<WiFiBloc>().add(GetCurrentWiFiEvent());
    } finally {
      _isInitializing = false;
    }
  }

  Future<void> _waitForLocationAndContinue() async {
    final completer = Completer<void>();
    late StreamSubscription subscription;
    
    subscription = context.read<LocationBloc>().stream.listen((state) {
      if (state is LocationLoaded) {
        // Location loaded successfully, now get nearest office
        context.read<LocationBloc>().add(GetNearestOfficeEvent(state.location));
        subscription.cancel();
        completer.complete();
      } else if (state is LocationError || 
                 state is LocationPermissionDenied ||
                 state is LocationGPSError) {
        // Location failed, continue with other initializations
        subscription.cancel();
        completer.complete();
      }
    });
    
    // Timeout after 10 seconds
    Timer(const Duration(seconds: 10), () {
      if (!completer.isCompleted) {
        subscription.cancel();
        completer.complete();
      }
    });
    
    return completer.future;
  }

  void _refreshAll() {
    _initializeDataSequentially();
  }

  @override
  Widget build(BuildContext context) {
    return TokenRefreshIndicator(
      child: Scaffold(
        backgroundColor: AppColors.background,
        appBar: AppBar(
          title: const Text(
            'Global Protect',
            style: TextStyle(
              fontWeight: FontWeight.w600,
              color: Colors.white,
              fontSize: 20,
            ),
          ),
          backgroundColor: AppColors.primary,
          elevation: 0,
          flexibleSpace: Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [AppColors.primary, AppColors.primaryDark],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
            ),
          ),
          actions: [
            const LogoutButton(),
          ],
        ),
        body: RefreshIndicator(
          onRefresh: () async {
            _refreshAll();
          },
          color: AppColors.primary,
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Welcome Section
                  _buildWelcomeSection(context),
                  const SizedBox(height: 24),
                  
                  // Unified Active Session & Location/WiFi Status
                  _buildUnifiedStatusWidget(),
                  const SizedBox(height: 24),
                  
                  // Today's Summary
                  _buildTodaysSummary(context),
                  const SizedBox(height: 24),
                  
                  // Quick Actions (minimal)
                  _buildQuickActions(context),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildUnifiedStatusWidget() {
    return BlocBuilder<LocationBloc, LocationState>(
      builder: (context, locationState) {
        Location? currentLocation;
        if (locationState is LocationLoaded) {
        currentLocation = locationState.location;
      } else if (locationState is LocationLoadedWithOfficeError) {
        currentLocation = locationState.location;
      } else if (locationState is LocationLoadedWithoutOffice) {
        currentLocation = locationState.location;
      } else if (locationState is NearestOfficeDetected) {
        currentLocation = locationState.userLocation; // Now we have location data
      }
        
        return EnhancedLocationStatusWidget(
          currentLocation: currentLocation,
          onClockInPressed: () => _handleClockIn(context, locationState),
          onClockOutPressed: () {
            final attendanceState = context.read<AttendanceBloc>().state;
            if (attendanceState is AttendanceLoaded) {
              _handleClockOut(context, attendanceState);
            }
          },
        );
      },
    );
  }

  Widget _buildStatusOverviewClockInButton() {
    return BlocBuilder<AttendanceBloc, AttendanceState>(
      builder: (context, attendanceState) {
        return BlocBuilder<LocationBloc, LocationState>(
          builder: (context, locationState) {
            return BlocBuilder<WiFiBloc, WiFiState>(
              builder: (context, wifiState) {
                if (attendanceState is AttendanceLoaded && attendanceState.isClockedIn) {
                  // Show Clock Out button if already clocked in
                  return Container(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: () => _handleClockOut(context, attendanceState),
                      icon: const Icon(Icons.logout, color: Colors.white),
                      label: const Text(
                        'Clock Out',
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w600,
                          fontSize: 16,
                        ),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.red.shade600,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                    ),
                  );
                }

                // Show Clock In button with all original functionality
                final bool canClockIn = _canClockIn(locationState, wifiState);
                final String buttonText = _getClockInButtonText(locationState, wifiState);
                final String statusText = _getStatusText(locationState, wifiState);

                return Column(
                  children: [
                    // Status text above button
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: canClockIn 
                            ? Colors.green.shade50 
                            : Colors.grey.shade50,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: canClockIn 
                              ? Colors.green.shade200 
                              : Colors.grey.shade200,
                        ),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            canClockIn ? Icons.check_circle : Icons.location_off,
                            color: canClockIn 
                                ? Colors.green.shade600 
                                : Colors.grey.shade600,
                            size: 20,
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              statusText,
                              style: TextStyle(
                                fontSize: 14,
                                color: canClockIn 
                                    ? Colors.green.shade700 
                                    : Colors.grey.shade700,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),
                    // Clock In button
                    Container(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: canClockIn ? () => _handleClockIn(context, locationState) : null,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: canClockIn 
                              ? Colors.green.shade600 
                              : Colors.grey.shade400,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        child: Text(
                          buttonText,
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ),
                  ],
                );
              },
            );
          },
        );
      },
    );
  }

  Widget _buildLocationWiFiStatusWithRefresh() {
    return Column(
      children: [
        Row(
          children: [
            Text(
              'Location & WiFi Status',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: Colors.grey.shade700,
              ),
            ),
            const Spacer(),
            IconButton(
              icon: Icon(Icons.refresh, size: 18, color: Colors.grey.shade600),
              onPressed: () {
                context.read<LocationBloc>().add(GetCurrentLocationEvent());
                context.read<WiFiBloc>().add(GetCurrentWiFiEvent());
              },
              tooltip: 'Refresh Location & WiFi',
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(),
            ),
          ],
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            // Location Status with more details
            Expanded(
              child: BlocBuilder<LocationBloc, LocationState>(
                builder: (context, state) {
                  return _buildEnhancedStatusIndicator(
                    icon: Icons.location_on,
                    label: 'Location',
                    status: _getLocationStatus(state),
                    detailedInfo: _getLocationDetailedInfo(state),
                    color: _getLocationColor(state),
                    onRefresh: () {
                      context.read<LocationBloc>().add(GetCurrentLocationEvent());
                    },
                  );
                },
              ),
            ),
            const SizedBox(width: 12),
            // WiFi Status with more details
            Expanded(
              child: BlocBuilder<WiFiBloc, WiFiState>(
                builder: (context, state) {
                  return _buildEnhancedStatusIndicator(
                    icon: Icons.wifi,
                    label: 'WiFi',
                    status: _getWiFiStatus(state),
                    detailedInfo: _getWiFiDetailedInfo(state),
                    color: _getWiFiColor(state),
                    onRefresh: () {
                      context.read<WiFiBloc>().add(GetCurrentWiFiEvent());
                    },
                  );
                },
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildEnhancedStatusIndicator({
    required IconData icon,
    required String label,
    required String status,
    required String detailedInfo,
    required Color color,
    required VoidCallback onRefresh,
  }) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Icon(icon, color: color, size: 20),
              IconButton(
                icon: Icon(Icons.refresh, size: 14, color: color),
                onPressed: onRefresh,
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
                tooltip: 'Refresh $label',
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: color,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            status,
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w600,
              color: color.withOpacity(0.9),
            ),
            textAlign: TextAlign.center,
          ),
          if (detailedInfo.isNotEmpty) ...[
            const SizedBox(height: 2),
            Text(
              detailedInfo,
              style: TextStyle(
                fontSize: 9,
                color: color.withOpacity(0.7),
              ),
              textAlign: TextAlign.center,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ],
      ),
    );
  }

  String _getLocationDetailedInfo(LocationState state) {
    if (state is LocationLoaded) {
      if (state.location != null) {
        return 'Lat: ${state.location!.latitude.toStringAsFixed(4)}\nLng: ${state.location!.longitude.toStringAsFixed(4)}';
      }
      return state.isValidForClockIn ? 'Within office area' : 'Outside office area';
    }
    if (state is LocationError) return 'Error: ${state.message}';
    if (state is LocationPermissionExplanationRequired) return 'Permission needed';
    if (state is LocationLoading) return 'Detecting...';
    return '';
  }

  String _getWiFiDetailedInfo(WiFiState state) {
    if (state is WiFiLoaded) {
      final networkName = state.wifiInfo.ssid ?? 'Unknown';
      return state.isOfficeNetwork 
          ? 'Connected to: $networkName\n(Office Network)' 
          : 'Connected to: $networkName\n(External Network)';
    }
    if (state is WiFiError) return 'Error: ${state.message}';
    if (state is WiFiPermissionRequired) return 'Permission needed';
    if (state is WiFiLoading) return 'Scanning...';
    return '';
  }

  Widget _buildActiveSessionStatus() {
    return BlocBuilder<AttendanceBloc, AttendanceState>(
      builder: (context, state) {
        if (state is AttendanceLoading) {
          return Row(
            children: [
              const SizedBox(
                width: 16,
                height: 16,
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
              const SizedBox(width: 12),
              Text(
                'Loading session status...',
                style: TextStyle(color: Colors.grey.shade600),
              ),
            ],
          );
        }

        if (state is AttendanceLoaded) {
          final isActive = state.isClockedIn;
          final currentAttendance = state.currentAttendance;
          
          return Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: isActive ? Colors.green.shade50 : Colors.grey.shade50,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(
                color: isActive ? Colors.green.shade200 : Colors.grey.shade200,
              ),
            ),
            child: Row(
              children: [
                Icon(
                  isActive ? Icons.work : Icons.work_off,
                  color: isActive ? Colors.green.shade600 : Colors.grey.shade600,
                  size: 20,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        isActive ? 'Active Session' : 'No Active Session',
                        style: TextStyle(
                          fontWeight: FontWeight.w600,
                          color: isActive ? Colors.green.shade700 : Colors.grey.shade700,
                        ),
                      ),
                      if (isActive && currentAttendance != null) ...[
                        const SizedBox(height: 4),
                        Text(
                          'Started: ${DateFormat('HH:mm').format(currentAttendance.clockInTime)}',
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.green.shade600,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ),
          );
        }

        if (state is AttendanceError) {
          return Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.red.shade50,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.red.shade200),
            ),
            child: Row(
              children: [
                Icon(Icons.error, color: Colors.red.shade600, size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Error loading session',
                    style: TextStyle(
                      color: Colors.red.shade700,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ],
            ),
          );
        }

        return Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.grey.shade50,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: Colors.grey.shade200),
          ),
          child: Row(
            children: [
              Icon(Icons.help_outline, color: Colors.grey.shade600, size: 20),
              const SizedBox(width: 8),
              Text(
                'Session status unknown',
                style: TextStyle(color: Colors.grey.shade700),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildLocationWiFiStatus() {
    return Row(
      children: [
        // Location Status
        Expanded(
          child: BlocBuilder<LocationBloc, LocationState>(
            builder: (context, state) {
              return _buildStatusIndicator(
                icon: Icons.location_on,
                label: 'Location',
                status: _getLocationStatus(state),
                color: _getLocationColor(state),
              );
            },
          ),
        ),
        const SizedBox(width: 12),
        // WiFi Status
        Expanded(
          child: BlocBuilder<WiFiBloc, WiFiState>(
            builder: (context, state) {
              return _buildStatusIndicator(
                icon: Icons.wifi,
                label: 'WiFi',
                status: _getWiFiStatus(state),
                color: _getWiFiColor(state),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildStatusIndicator({
    required IconData icon,
    required String label,
    required String status,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Column(
        children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(height: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: color,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            status,
            style: TextStyle(
              fontSize: 10,
              color: color.withOpacity(0.8),
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  String _getLocationStatus(LocationState state) {
    if (state is LocationLoading) return 'Loading...';
    if (state is LocationLoaded) {
      return state.isValidForClockIn ? 'Valid' : 'Invalid';
    }
    if (state is LocationError) return 'Error';
    if (state is LocationPermissionExplanationRequired) return 'Permission';
    return 'Unknown';
  }

  Color _getLocationColor(LocationState state) {
    if (state is LocationLoaded && state.isValidForClockIn) return Colors.green;
    if (state is LocationError) return Colors.red;
    if (state is LocationPermissionExplanationRequired) return Colors.orange;
    if (state is LocationLoading) return Colors.blue;
    return Colors.grey;
  }

  String _getWiFiStatus(WiFiState state) {
    if (state is WiFiLoading) return 'Loading...';
    if (state is WiFiLoaded) {
      return state.isOfficeNetwork ? 'Office' : 'Other';
    }
    if (state is WiFiError) return 'Error';
    if (state is WiFiPermissionRequired) return 'Permission';
    return 'Unknown';
  }

  Color _getWiFiColor(WiFiState state) {
    if (state is WiFiLoaded && state.isOfficeNetwork) return Colors.green;
    if (state is WiFiLoaded && !state.isOfficeNetwork) return Colors.orange;
    if (state is WiFiError) return Colors.red;
    if (state is WiFiPermissionRequired) return Colors.orange;
    if (state is WiFiLoading) return Colors.blue;
    return Colors.grey;
  }

  Widget _buildWelcomeSection(BuildContext context) {
    final hour = DateTime.now().hour;
    String greeting;
    if (hour < 12) {
      greeting = 'Good Morning';
    } else if (hour < 17) {
      greeting = 'Good Afternoon';
    } else {
      greeting = 'Good Evening';
    }

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            greeting,
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w600,
                  color: AppColors.textPrimary,
                ),
          ),
          const SizedBox(height: 4),
          Text(
            'Ready to start your day?',
            style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                  color: AppColors.textSecondary,
                ),
          ),
        ],
      ),
    );
  }
  
  Widget _buildLoadingCard() {
    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Container(
        padding: const EdgeInsets.all(24),
        child: const Column(
          children: [
            CircularProgressIndicator(),
            SizedBox(height: 16),
            Text('Loading attendance status...'),
          ],
        ),
      ),
    );
  }

  Widget _buildErrorCard(BuildContext context, String message) {
    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          color: Colors.red.shade50,
        ),
        child: Column(
          children: [
            Icon(Icons.error_outline, color: Colors.red.shade600, size: 48),
            const SizedBox(height: 16),
            Text(
              'Error loading attendance status',
              style: TextStyle(
                color: Colors.red.shade700,
                fontWeight: FontWeight.w600,
                fontSize: 16,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              message,
              style: TextStyle(color: Colors.red.shade600),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              onPressed: () {
                context.read<AttendanceBloc>().add(GetCurrentAttendanceEvent());
              },
              icon: const Icon(Icons.refresh),
              label: const Text('Retry'),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.red.shade600,
                foregroundColor: Colors.white,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildClockInCard(BuildContext context, LocationState locationState, WiFiState wifiState) {
    final bool canClockIn = _canClockIn(locationState, wifiState);
    final String buttonText = _getClockInButtonText(locationState, wifiState);
    final String statusText = _getStatusText(locationState, wifiState);

    return Card(
      elevation: 6,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          gradient: LinearGradient(
            colors: canClockIn 
                ? [Colors.green.shade50, Colors.green.shade100]
                : [Colors.grey.shade50, Colors.grey.shade100],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: Column(
          children: [
            Icon(
              canClockIn ? Icons.check_circle : Icons.location_off,
              size: 48,
              color: canClockIn ? Colors.green.shade600 : Colors.grey.shade600,
            ),
            const SizedBox(height: 16),
            Text(
              statusText,
              style: TextStyle(
                fontSize: 14,
                color: canClockIn ? Colors.green.shade700 : Colors.grey.shade700,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: canClockIn ? () => _handleClockIn(context, locationState) : null,
                style: ElevatedButton.styleFrom(
                  backgroundColor: canClockIn ? Colors.green.shade600 : Colors.grey.shade400,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: Text(
                  buttonText,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTodaysSummary(BuildContext context) {
    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.today, color: AppColors.primary),
                const SizedBox(width: 8),
                Text(
                  'Today\'s Summary',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            BlocBuilder<AttendanceBloc, AttendanceState>(
            builder: (context, state) {
              if (state is AttendanceLoaded && state.currentAttendance != null) {
                final record = state.currentAttendance!;
                
                // Always show only total hours worked
                if (record.totalHours != null) {
                  final totalHours = (record.totalHours!.inMinutes.toDouble() / 60.0).toStringAsFixed(2);
                  return _buildSummaryRow('Total Hours Worked', '$totalHours hrs');
                } else {
                  return _buildSummaryRow('Total Hours Worked', '0.00 hrs');
                }
              }
              return const Text('No attendance data for today');
            },
          ),
          ],
        ),
      ),
    );
  }

  Widget _buildSummaryRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontWeight: FontWeight.w500)),
          Text(value, style: const TextStyle(color: Colors.grey)),
        ],
      ),
    );
  }

  Widget _buildQuickActions(BuildContext context) {
    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.flash_on, color: AppColors.primary),
                const SizedBox(width: 8),
                Text(
                  'Quick Actions',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: _buildQuickActionButton(
                    icon: Icons.history,
                    label: 'History',
                    onTap: () {
                      // Navigate to attendance history
                    },
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _buildQuickActionButton(
                    icon: Icons.schedule,
                    label: 'Timesheet',
                    onTap: () {
                      // Navigate to timesheet
                    },
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildQuickActionButton({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 12),
        decoration: BoxDecoration(
          border: Border.all(color: Colors.grey.shade300),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          children: [
            Icon(icon, color: AppColors.primary, size: 24),
            const SizedBox(height: 8),
            Text(
              label,
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }

  bool _canClockIn(LocationState locationState, WiFiState wifiState) {
    // Primary method: WiFi + Location
    if (wifiState is WiFiLoaded &&
        wifiState.isOfficeNetwork &&
        (locationState is LocationLoaded ||
         locationState is LocationLoadedWithOfficeError ||
         locationState is LocationLoadedWithoutOffice ||
         locationState is NearestOfficeDetected) &&
        _isLocationValidForClockIn(locationState)) {
      return true;
    }

    // Fallback method: Location only
    if ((locationState is LocationLoaded ||
         locationState is LocationLoadedWithOfficeError ||
         locationState is LocationLoadedWithoutOffice ||
         locationState is NearestOfficeDetected) &&
        _isLocationValidForClockIn(locationState)) {
      return true;
    }

    return false;
  }

  // Helper method to check if location is valid for clock-in
  bool _isLocationValidForClockIn(LocationState locationState) {
    if (locationState is LocationLoaded) {
      return locationState.isValidForClockIn;
    }
    if (locationState is LocationLoadedWithOfficeError) {
      return locationState.isValidForClockIn;
    }
    if (locationState is LocationLoadedWithoutOffice) {
      return locationState.isValidForClockIn;
    }
    if (locationState is NearestOfficeDetected) {
      // Check if user is within office bounds
      return locationState.office.isLocationWithinBounds(locationState.userLocation);
    }
    return false;
  }

  String _getClockInButtonText(LocationState locationState, WiFiState wifiState) {
    if (!_canClockIn(locationState, wifiState)) {
      if (locationState is LocationGPSError) {
        return 'Clock In (GPS Error)';
      }
      if (locationState is LocationPermissionDenied) {
        return 'Clock In (Permission Required)';
      }
      if (locationState is LocationLoading) {
        return 'Clock In (Loading...)';
      }
      if (locationState is LocationLoadedWithoutOffice) {
        return 'Clock In (No Office Nearby)';
      }
      return 'Clock In (Unavailable)';
    }

    if (wifiState is WiFiLoaded &&
        wifiState.isOfficeNetwork &&
        _isLocationValidForClockIn(locationState)) {
      if (locationState is NearestOfficeDetected) {
        return 'Clock In at ${locationState.office.name}';
      }
      return 'Clock In (WiFi + Location)';
    }

    if (locationState is NearestOfficeDetected) {
      return 'Clock In at ${locationState.office.name}';
    }

    return 'Clock In (Location Only)';
  }

  String _getStatusText(LocationState locationState, WiFiState wifiState) {
    if (locationState is LocationError) {
      return 'Location error: ${locationState.message}';
    }

    if (locationState is LocationGPSError) {
      return 'GPS error: ${locationState.errorDetails.message}. Attempt ${locationState.attemptCount}';
    }

    if (locationState is LocationPermissionDenied) {
      return locationState.isPermanentlyDenied 
          ? 'Location permission permanently denied. Please enable in settings.'
          : 'Location permission required for clock-in';
    }

    if (locationState is LocationPermissionExplanationRequired) {
      return 'Location permission needed: ${locationState.reason}';
    }

    if (locationState is LocationLoadedWithOfficeError) {
      return locationState.isValidForClockIn 
          ? 'Ready to clock in (Office detection issue: ${locationState.officeError})'
          : 'You are not within the office location';
    }

    if (locationState is LocationLoadedWithoutOffice) {
      return locationState.isValidForClockIn 
          ? 'Ready to clock in (No office detected nearby)'
          : 'You are not within any office location';
    }

    if (locationState is NearestOfficeDetected) {
      final isWithinBounds = locationState.office.isLocationWithinBounds(locationState.userLocation);
      return isWithinBounds 
          ? 'Ready to clock in at ${locationState.office.name}'
          : 'Move closer to ${locationState.office.name} (${locationState.distance.toStringAsFixed(0)}m away)';
    }

    if (locationState is LocationLoaded && !locationState.isValidForClockIn) {
      return 'You are not within the office location';
    }

    if (locationState is LocationLoading) {
      return 'Getting your location...';
    }

    if (_canClockIn(locationState, wifiState)) {
      return 'Ready to clock in!';
    }

    return 'Unable to verify your location';
  }

  void _handleClockIn(BuildContext context, LocationState locationState) {
    // Handle successful clock-in cases
  if (locationState is LocationLoaded) {
    context.read<AttendanceBloc>().add(
      ClockInEvent(
        location: '${locationState.location.latitude},${locationState.location.longitude}',
      ),
    );

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Clock-in request submitted!'),
        backgroundColor: Colors.green,
      ),
    );
    return;
  }

  if (locationState is LocationLoadedWithOfficeError) {
    context.read<AttendanceBloc>().add(
      ClockInEvent(
        location: '${locationState.location.latitude},${locationState.location.longitude}',
      ),
    );

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Clock-in request submitted!'),
        backgroundColor: Colors.green,
      ),
    );
    return;
  }

  if (locationState is LocationLoadedWithoutOffice) {
    context.read<AttendanceBloc>().add(
      ClockInEvent(
        location: '${locationState.location.latitude},${locationState.location.longitude}',
      ),
    );

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Clock-in request submitted!'),
        backgroundColor: Colors.green,
      ),
    );
    return;
  }

    if (locationState is NearestOfficeDetected) {
      context.read<AttendanceBloc>().add(
        ClockInEvent(
          location: '${locationState.userLocation.latitude},${locationState.userLocation.longitude}',
          officeId: locationState.office.id,
        ),
      );

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Clock-in request submitted at ${locationState.office.name}!'),
          backgroundColor: Colors.green,
        ),
      );
      return;
    }

    // Handle error cases with specific actions
    String errorMessage;
    List<Widget> actions = [];
    
    if (locationState is LocationPermissionDenied) {
      errorMessage = locationState.isPermanentlyDenied
          ? 'Location permission permanently denied. Please enable location access in your device settings.'
          : 'Location permission required for clock-in';
      actions = [
        if (!locationState.isPermanentlyDenied)
          TextButton(
            onPressed: () {
              Navigator.of(context).pop();
              context.read<LocationBloc>().add(RequestLocationPermissionEvent());
            },
            child: const Text('Grant Permission'),
          ),
        if (locationState.isPermanentlyDenied)
          TextButton(
            onPressed: () {
              Navigator.of(context).pop();
              context.read<LocationBloc>().add(OpenLocationSettingsEvent());
            },
            child: const Text('Open Settings'),
          ),
      ];
    } else if (locationState is LocationGPSError) {
      errorMessage = 'GPS Error: ${locationState.errorDetails.message}';
      actions = [
        if (locationState.canRetry)
          TextButton(
            onPressed: () {
              Navigator.of(context).pop();
              context.read<LocationBloc>().add(RetryLocationEvent());
            },
            child: const Text('Retry GPS'),
          ),
        if (locationState.hasAlternativeMethod)
          TextButton(
            onPressed: () {
              Navigator.of(context).pop();
              context.read<LocationBloc>().add(GetCurrentLocationEvent());
            },
            child: const Text('Use Alternative'),
          ),
      ];
    } else if (locationState is LocationError) {
      errorMessage = 'Location error: ${locationState.message}';
      actions = [
        TextButton(
          onPressed: () {
            Navigator.of(context).pop();
            context.read<LocationBloc>().add(GetCurrentLocationEvent());
          },
          child: const Text('Retry'),
        ),
      ];
    } else if (locationState is LocationLoading) {
      errorMessage = 'Please wait while we get your location...';
    } else if (locationState is LocationServiceDisabled) {
      errorMessage = 'Location services are disabled. Please enable them in settings.';
      actions = [
        TextButton(
          onPressed: () {
            Navigator.of(context).pop();
            context.read<LocationBloc>().add(OpenLocationSettingsEvent());
          },
          child: const Text('Open Settings'),
        ),
      ];
    } else if (locationState is LocationPermissionExplanationRequired) {
      errorMessage = 'Location permission needed: ${locationState.reason}';
      actions = [
        TextButton(
          onPressed: () {
            Navigator.of(context).pop();
            context.read<LocationBloc>().add(RequestLocationPermissionEvent());
          },
          child: const Text('Grant Permission'),
        ),
      ];
    } else {
      errorMessage = 'Location not available. Please check your location settings.';
      actions = [
        TextButton(
          onPressed: () {
            Navigator.of(context).pop();
            context.read<LocationBloc>().add(GetCurrentLocationEvent());
          },
          child: const Text('Retry'),
        ),
      ];
    }
    
    // Show error dialog with actionable options
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Cannot Clock In'),
        content: Text(errorMessage),
        actions: [
          ...actions,
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  Future<void> _handleClockOut(BuildContext context, AttendanceLoaded attendanceState) async {
    try {
      // Show loading indicator
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (context) => const Center(
          child: CircularProgressIndicator(),
        ),
      );

      // Capture current location
      Position? position;
      String? locationString;
      
      try {
        // Check location permission
        LocationPermission permission = await Geolocator.checkPermission();
        if (permission == LocationPermission.denied) {
          permission = await Geolocator.requestPermission();
        }
        
        if (permission == LocationPermission.whileInUse || 
            permission == LocationPermission.always) {
          // Get current position with timeout
          position = await Geolocator.getCurrentPosition(
            desiredAccuracy: LocationAccuracy.high,
            timeLimit: const Duration(seconds: 10),
          );
          locationString = '${position.latitude.toStringAsFixed(6)}, ${position.longitude.toStringAsFixed(6)}';
        } else {
          locationString = 'Location permission denied';
        }
      } catch (e) {
        locationString = 'Unable to get location: ${e.toString()}';
      }

      // Hide loading indicator
      Navigator.of(context).pop();

      // Calculate total worked time
      Duration? workedDuration;
      if (attendanceState.currentAttendance?.clockInTime != null) {
        final clockInTime = attendanceState.currentAttendance!.clockInTime!;
        workedDuration = DateTime.now().difference(clockInTime);
      }

      // Show confirmation dialog
      await ClockOutConfirmationDialog.show(
        context: context,
        currentLocation: locationString,
        workedDuration: workedDuration,
        onConfirm: () {
          _performClockOut(context, attendanceState, position, locationString);
        },
        onCancel: () {
          // User cancelled, do nothing
        },
      );
    } catch (e) {
      // Hide loading indicator if still showing
      if (Navigator.canPop(context)) {
        Navigator.of(context).pop();
      }
      
      // Show error message
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error preparing clock-out: ${e.toString()}'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  void _performClockOut(BuildContext context, AttendanceLoaded attendanceState, 
                       Position? position, String? locationString) {
    if (attendanceState.currentAttendance?.id != null) {
      // Trigger clock-out event with location data
      context.read<AttendanceBloc>().add(
        ClockOutEvent(
          attendanceId: attendanceState.currentAttendance!.id!,
          notes: 'Clock-out from mobile app',
          location: locationString ?? 'Location unavailable',
        ),
      );

      // Show success message
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Clock-out successful!'),
          backgroundColor: Colors.green,
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Error: No active attendance record found'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }
}
