import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:global_protect_app/features/clock_in/presentation/bloc/attendance/attendance_bloc.dart';
import 'package:global_protect_app/features/clock_in/presentation/bloc/attendance/attendance_state.dart';
import 'package:global_protect_app/features/clock_in/presentation/bloc/wifi/wifi_bloc.dart';
import 'package:global_protect_app/features/clock_in/presentation/bloc/wifi/wifi_event.dart';
import 'package:global_protect_app/features/clock_in/presentation/bloc/wifi/wifi_state.dart';
import 'package:global_protect_app/features/location/presentation/bloc/location_bloc.dart';
import 'package:global_protect_app/features/location/presentation/bloc/location_event.dart';
import 'package:global_protect_app/features/location/presentation/bloc/location_state.dart';
import 'package:global_protect_app/features/location/domain/entities/location.dart';

class EnhancedLocationStatusWidget extends StatelessWidget {
  final Location? currentLocation;
  final VoidCallback? onClockInPressed;
  final VoidCallback? onClockOutPressed;

  const EnhancedLocationStatusWidget({
    Key? key,
    this.currentLocation,
    this.onClockInPressed,
    this.onClockOutPressed,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 6,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          gradient: LinearGradient(
            colors: [Colors.blue.shade50, Colors.blue.shade100],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  Icons.dashboard,
                  color: Colors.blue.shade700,
                  size: 24,
                ),
                const SizedBox(width: 8),
                Text(
                  'Status Overview',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                    color: Colors.blue.shade700,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            
            // Active Session Status
            _buildActiveSessionStatus(),
            const SizedBox(height: 16),
            
            // Enhanced Location & Office Status
            _buildEnhancedLocationOfficeStatus(context),
            const SizedBox(height: 16),
            
            // Clock In/Out Button
            _buildClockInOutButton(context),
          ],
        ),
      ),
    );
  }

  Widget _buildActiveSessionStatus() {
    return BlocBuilder<AttendanceBloc, AttendanceState>(
      builder: (context, state) {
        if (state is AttendanceLoaded && state.isClockedIn) {
          return Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.green.shade50,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.green.shade200),
            ),
            child: Row(
              children: [
                Icon(Icons.access_time, color: Colors.green.shade600, size: 20),
                const SizedBox(width: 8),
                Text(
                  'Active Session',
                  style: TextStyle(
                    fontWeight: FontWeight.w600,
                    color: Colors.green.shade700,
                  ),
                ),
                const Spacer(),
                Text(
                  'Since ${_formatTime(state.currentAttendance?.clockInTime)}',
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.green.shade600,
                  ),
                ),
              ],
            ),
          );
        }
        return Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.grey.shade100,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: Colors.grey.shade300),
          ),
          child: Row(
            children: [
              Icon(Icons.schedule, color: Colors.grey.shade600, size: 20),
              const SizedBox(width: 8),
              Text(
                'No Active Session',
                style: TextStyle(
                  fontWeight: FontWeight.w600,
                  color: Colors.grey.shade700,
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildEnhancedLocationOfficeStatus(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Location & Office Status',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: Colors.blue.shade700,
              ),
            ),
            IconButton(
              icon: Icon(Icons.refresh, color: Colors.blue.shade600, size: 20),
              onPressed: () {
                _refreshLocationAndOfficeStatus(context);
              },
              tooltip: 'Refresh Status',
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(),
            ),
          ],
        ),
        const SizedBox(height: 12),
        
        // Nearest Office Information
        BlocBuilder<LocationBloc, LocationState>(
          builder: (context, state) {
            // Add specific handling for permission states
            if (state is LocationPermissionDenied) {
              return _buildPermissionDeniedCard(context, state);
            }
            
            if (state is LocationPermissionExplanationRequired) {
              return _buildPermissionExplanationCard(context, state);
            }
            
            if (state is NearestOfficeDetected) {
              return _buildNearestOfficeCard(state);
            }
            
            if (state is LocationLoading) {
              return _buildLoadingCard();
            }
            
            if (state is LocationError) {
              return _buildErrorCard(state.message);
            }
            
            if (state is LocationLoadedWithOfficeError) {
              return _buildLocationWithOfficeErrorCard(context, state);
            }
            
            if (state is LocationLoadedWithoutOffice) {
              return _buildLocationWithoutOfficeCard(state);
            }
          
            // Remove the conflicting PostFrameCallback logic
            // The home page now handles sequential initialization
          
            return _buildNoLocationCard();
          },
        ),
        
        const SizedBox(height: 12),
        
        // Location and WiFi Status Row
        Row(
          children: [
            Expanded(
              child: BlocBuilder<LocationBloc, LocationState>(
                builder: (context, state) {
                  return _buildStatusIndicator(
                    icon: Icons.location_on,
                    label: 'GPS',
                    status: _getLocationStatus(state),
                    color: _getLocationColor(state),
                  );
                },
              ),
            ),
            const SizedBox(width: 12),
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
        ),
      ],
    );
  }

  Widget _buildNearestOfficeCard(NearestOfficeDetected state) {
    final office = state.office;
    final distance = state.distance;
    
    // Fix: Add null check before using currentLocation
    final isWithinRange = currentLocation != null 
        ? office.isLocationWithinBounds(currentLocation!) 
        : false;
    
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isWithinRange ? Colors.green.shade50 : Colors.orange.shade50,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: isWithinRange ? Colors.green.shade200 : Colors.orange.shade200,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Icons.business,
                color: isWithinRange ? Colors.green.shade700 : Colors.orange.shade700,
                size: 20,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  office.name,
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    color: isWithinRange ? Colors.green.shade700 : Colors.orange.shade700,
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: isWithinRange ? Colors.green.shade100 : Colors.orange.shade100,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  '${distance.toStringAsFixed(2)} km',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: isWithinRange ? Colors.green.shade700 : Colors.orange.shade700,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Icon(
                isWithinRange ? Icons.check_circle : Icons.location_pin,
                color: isWithinRange ? Colors.green.shade600 : Colors.orange.shade600,
                size: 16,
              ),
              const SizedBox(width: 4),
              Expanded(
                child: Text(
                  isWithinRange 
                      ? 'Within office boundary - Ready to clock in'
                      : 'Outside office boundary - Move closer to clock in',
                  style: TextStyle(
                    fontSize: 12,
                    color: isWithinRange ? Colors.green.shade600 : Colors.orange.shade600,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildLoadingCard() {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.blue.shade50,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.blue.shade200),
      ),
      child: Row(
        children: [
          SizedBox(
            width: 16,
            height: 16,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              valueColor: AlwaysStoppedAnimation<Color>(Colors.blue.shade600),
            ),
          ),
          const SizedBox(width: 12),
          Text(
            'Detecting nearest office...',
            style: TextStyle(
              color: Colors.blue.shade700,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorCard(String message) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.red.shade50,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.red.shade200),
      ),
      child: Row(
        children: [
          Icon(Icons.error, color: Colors.red.shade600, size: 16),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              message,
              style: TextStyle(
                fontSize: 12,
                color: Colors.red.shade600,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNoLocationCard() {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.grey.shade100,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.grey.shade300),
      ),
      child: Row(
        children: [
          Icon(Icons.location_off, color: Colors.grey.shade600, size: 16),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              'Location not available',
              style: TextStyle(
                fontSize: 12,
                color: Colors.grey.shade600,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPermissionDeniedCard(BuildContext context, LocationPermissionDenied state) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.red.shade50,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.red.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.location_disabled, color: Colors.red.shade600, size: 16),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Location Permission Required',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: Colors.red.shade600,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            state.message,
            style: TextStyle(
              fontSize: 11,
              color: Colors.red.shade600,
            ),
          ),
          const SizedBox(height: 8),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () {
                if (state.isPermanentlyDenied) {
                  context.read<LocationBloc>().add(OpenLocationSettingsEvent());
                } else {
                  context.read<LocationBloc>().add(RequestLocationPermissionEvent());
                }
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.red.shade600,
                padding: const EdgeInsets.symmetric(vertical: 8),
              ),
              child: Text(
                state.isPermanentlyDenied ? 'Open Settings' : 'Grant Permission',
                style: const TextStyle(color: Colors.white, fontSize: 12),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPermissionExplanationCard(BuildContext context, LocationPermissionExplanationRequired state) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.orange.shade50,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.orange.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.info, color: Colors.orange.shade600, size: 16),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Why We Need Location',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: Colors.orange.shade600,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            state.reason,
            style: TextStyle(
              fontSize: 11,
              color: Colors.orange.shade600,
            ),
          ),
          const SizedBox(height: 8),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () {
                context.read<LocationBloc>().add(RequestLocationPermissionEvent());
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.orange.shade600,
                padding: const EdgeInsets.symmetric(vertical: 8),
              ),
              child: const Text(
                'Allow Location Access',
                style: TextStyle(color: Colors.white, fontSize: 12),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusIndicator({
    required IconData icon,
    required String label,
    required String status,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Column(
        children: [
          Icon(icon, color: color, size: 16),
          const SizedBox(height: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w600,
              color: color,
            ),
          ),
          Text(
            status,
            style: TextStyle(
              fontSize: 9,
              color: color,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildClockInOutButton(BuildContext context) {
    return BlocBuilder<AttendanceBloc, AttendanceState>(
      builder: (context, attendanceState) {
        return BlocBuilder<LocationBloc, LocationState>(
          builder: (context, locationState) {
            return BlocBuilder<WiFiBloc, WiFiState>(
              builder: (context, wifiState) {
                if (attendanceState is AttendanceLoaded && attendanceState.isClockedIn) {
                  return Container(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: onClockOutPressed,
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

                final bool canClockIn = _canClockIn(locationState, wifiState);
                final String buttonText = _getClockInButtonText(locationState, wifiState);
                final String statusText = _getStatusText(locationState, wifiState);

                return Column(
                  children: [
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
                    Container(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: canClockIn ? onClockInPressed : null,
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

  // Add these missing methods before the existing helper methods

  Widget _buildLocationWithOfficeErrorCard(BuildContext context, LocationLoadedWithOfficeError state) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.orange.shade50,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.orange.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Icons.location_on,
                color: Colors.green.shade600,
                size: 20,
              ),
              const SizedBox(width: 8),
              Text(
                'Location Active',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: Colors.green.shade700,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            'GPS: ${state.location.latitude.toStringAsFixed(6)}, ${state.location.longitude.toStringAsFixed(6)}',
            style: TextStyle(
              fontSize: 12,
              color: Colors.grey.shade600,
            ),
          ),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: Colors.orange.shade100,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              children: [
                Icon(
                  Icons.warning_amber,
                  color: Colors.orange.shade600,
                  size: 16,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Office Detection Error: ${state.officeError}',
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.orange.shade700,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLocationWithoutOfficeCard(LocationLoadedWithoutOffice state) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.blue.shade50,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.blue.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Icons.location_on,
                color: Colors.green.shade600,
                size: 20,
              ),
              const SizedBox(width: 8),
              Text(
                'Location Active',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: Colors.green.shade700,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            'GPS: ${state.location.latitude.toStringAsFixed(6)}, ${state.location.longitude.toStringAsFixed(6)}',
            style: TextStyle(
              fontSize: 12,
              color: Colors.grey.shade600,
            ),
          ),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: Colors.blue.shade100,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              children: [
                Icon(
                  Icons.info_outline,
                  color: Colors.blue.shade600,
                  size: 16,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'No nearby office found. You may be outside the office boundary.',
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.blue.shade700,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // Helper methods
  String _formatTime(DateTime? time) {
    if (time == null) return 'Unknown';
    return '${time.hour.toString().padLeft(2, '0')}:${time.minute.toString().padLeft(2, '0')}';
  }

  bool _canClockIn(LocationState locationState, WiFiState wifiState) {
    // Add your clock-in logic here
    if (locationState is NearestOfficeDetected && currentLocation != null) {
      return locationState.office.isLocationWithinBounds(currentLocation!);
    }
    return false;
  }

  String _getClockInButtonText(LocationState locationState, WiFiState wifiState) {
    if (_canClockIn(locationState, wifiState)) {
      return 'Clock In';
    }
    return 'Cannot Clock In';
  }

  String _getStatusText(LocationState locationState, WiFiState wifiState) {
    if (locationState is NearestOfficeDetected && currentLocation != null) {
      final isWithinRange = locationState.office.isLocationWithinBounds(currentLocation!);
      if (isWithinRange) {
        return 'Ready to clock in at ${locationState.office.name}';
      } else {
        return 'Move closer to ${locationState.office.name} (${locationState.distance.toStringAsFixed(2)} km away)';
      }
    }
    if (locationState is LocationLoading) {
      return 'Detecting location...';
    }
    return 'Location not available';
  }

  String _getLocationStatus(LocationState state) {
    if (state is LocationLoaded || 
        state is LocationLoadedWithOfficeError ||
        state is LocationLoadedWithoutOffice ||
        state is NearestOfficeDetected) return 'Active';
    if (state is LocationLoading) return 'Loading';
    if (state is LocationPermissionDenied) return 'Permission Denied';
    if (state is LocationPermissionExplanationRequired) return 'Permission Required';
    if (state is LocationGPSError) return 'GPS Error';
    if (state is LocationError) return 'Error';
    return 'Inactive';
  }

  Color _getLocationColor(LocationState state) {
    if (state is LocationLoaded || 
        state is LocationLoadedWithOfficeError ||
        state is LocationLoadedWithoutOffice ||
        state is NearestOfficeDetected) return Colors.green;
    if (state is LocationLoading) return Colors.blue;
    if (state is LocationPermissionDenied) return Colors.red;
    if (state is LocationPermissionExplanationRequired) return Colors.orange;
    if (state is LocationGPSError) return Colors.red;
    if (state is LocationError) return Colors.red;
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
  Future<void> _refreshLocationAndOfficeStatus(BuildContext context) async {
    // First refresh WiFi status
    context.read<WiFiBloc>().add(GetCurrentWiFiEvent());
    
    // Check permissions and request location
    context.read<LocationBloc>().add(CheckLocationPermissionEvent());
    context.read<LocationBloc>().add(GetCurrentLocationEvent());
    
    // Wait for location to load, then get nearest office (same pattern as startup)
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
        // Location failed, stop waiting
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
}