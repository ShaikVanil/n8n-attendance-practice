import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../bloc/location_bloc.dart';
import '../bloc/location_event.dart';
import '../bloc/location_state.dart';
import 'location_permission_explanation_widget.dart';
import 'location_accuracy_widget.dart';

class LocationStatusWidget extends StatelessWidget {
  const LocationStatusWidget({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<LocationBloc, LocationState>(
      builder: (context, state) {
        return Card(
          margin: const EdgeInsets.all(16),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.location_on, color: Colors.blue),
                    const SizedBox(width: 8),
                    const Text(
                      'Location Status',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const Spacer(),
                    IconButton(
                      icon: const Icon(Icons.refresh),
                      onPressed: () {
                        context.read<LocationBloc>().add(GetCurrentLocationEvent());
                      },
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                _buildLocationContent(context, state),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildLocationContent(BuildContext context, LocationState state) {
    if (state is LocationLoading) {
      return const Center(
        child: CircularProgressIndicator(),
      );
    }

    if (state is LocationLoaded) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildLocationDetail('Latitude', state.location.latitude.toStringAsFixed(6)),
          _buildLocationDetail('Longitude', state.location.longitude.toStringAsFixed(6)),
          _buildLocationDetail('Accuracy', '${state.location.accuracy.toStringAsFixed(1)}m'),
          _buildLocationDetail('Timestamp', _formatTimestamp(state.location.timestamp)),
          const SizedBox(height: 16),
          _buildAccuracyIndicator(state.location.accuracy),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: state.isValidForClockIn ? Colors.green.shade50 : Colors.red.shade50,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(
                color: state.isValidForClockIn ? Colors.green : Colors.red,
              ),
            ),
            child: Row(
              children: [
                Icon(
                  state.isValidForClockIn ? Icons.check_circle : Icons.error,
                  color: state.isValidForClockIn ? Colors.green : Colors.red,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    state.isValidForClockIn
                        ? 'Location is valid for clock-in'
                        : 'You must be at the office to clock in',
                    style: TextStyle(
                      color: state.isValidForClockIn ? Colors.green.shade700 : Colors.red.shade700,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      );
    }

    if (state is LocationPermissionExplanationRequired) {
      return LocationPermissionExplanationWidget(
        onRequestPermission: () {
          context.read<LocationBloc>().add(RequestLocationPermissionEvent());
        },
        onOpenSettings: () {
          context.read<LocationBloc>().add(OpenLocationSettingsEvent());
        },
      );
    }

    if (state is LocationPermissionDenied) {
      return Column(
        children: [
          Icon(
            state.isPermanentlyDenied ? Icons.settings : Icons.location_disabled,
            size: 48,
            color: state.isPermanentlyDenied ? Colors.red : Colors.orange,
          ),
          const SizedBox(height: 16),
          Text(
            state.message,
            textAlign: TextAlign.center,
            style: TextStyle(
              color: state.isPermanentlyDenied ? Colors.red : Colors.orange,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 16),
          if (state.isPermanentlyDenied) ...[
            const Text(
              'Location permission has been permanently denied. Please enable it in your device settings.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey),
            ),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              onPressed: () {
                context.read<LocationBloc>().add(OpenLocationSettingsEvent());
              },
              icon: const Icon(Icons.settings),
              label: const Text('Open Settings'),
            ),
          ] else ...[
            ElevatedButton.icon(
              onPressed: () {
                context.read<LocationBloc>().add(
                  RequestLocationPermissionEvent(showExplanation: true),
                );
              },
              icon: const Icon(Icons.info),
              label: const Text('Why do we need this?'),
            ),
            const SizedBox(height: 8),
            TextButton(
              onPressed: () {
                context.read<LocationBloc>().add(RequestLocationPermissionEvent());
              },
              child: const Text('Grant Permission'),
            ),
          ],
        ],
      );
    }

    if (state is LocationServiceDisabled) {
      return Column(
        children: [
          const Icon(Icons.location_off, size: 48, color: Colors.red),
          const SizedBox(height: 16),
          Text(
            state.message,
            textAlign: TextAlign.center,
            style: const TextStyle(color: Colors.red),
          ),
          const SizedBox(height: 16),
          const Text(
            'Please enable location services in your device settings.',
            textAlign: TextAlign.center,
            style: TextStyle(color: Colors.grey),
          ),
          const SizedBox(height: 16),
          ElevatedButton.icon(
            onPressed: () {
              context.read<LocationBloc>().add(OpenLocationSettingsEvent());
            },
            icon: const Icon(Icons.settings),
            label: const Text('Open Settings'),
          ),
        ],
      );
    }

    if (state is LocationError) {
      return Column(
        children: [
          const Icon(Icons.error, size: 48, color: Colors.red),
          const SizedBox(height: 16),
          Text(
            state.message,
            textAlign: TextAlign.center,
            style: const TextStyle(color: Colors.red),
          ),
          if (state.errorCode != null) ...[
            const SizedBox(height: 8),
            Text(
              'Error Code: ${state.errorCode}',
              textAlign: TextAlign.center,
              style: const TextStyle(color: Colors.grey, fontSize: 12),
            ),
          ],
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: () {
              context.read<LocationBloc>().add(GetCurrentLocationEvent());
            },
            child: const Text('Retry'),
          ),
        ],
      );
    }

    return Column(
      children: [
        const Icon(Icons.location_searching, size: 48, color: Colors.grey),
        const SizedBox(height: 16),
        const Text(
          'Tap refresh to get your current location',
          textAlign: TextAlign.center,
          style: TextStyle(color: Colors.grey),
        ),
        const SizedBox(height: 16),
        ElevatedButton(
          onPressed: () {
            context.read<LocationBloc>().add(GetCurrentLocationEvent());
          },
          child: const Text('Get Location'),
        ),
      ],
    );
  }

  Widget _buildLocationInfo(BuildContext context, LocationLoaded state) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  Icons.location_on,
                  color: state.isValidForClockIn ? Colors.green : Colors.orange,
                ),
                const SizedBox(width: 8),
                Text(
                  'Current Location',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            _buildLocationDetail('Latitude', state.location.latitude.toStringAsFixed(6)),
            _buildLocationDetail('Longitude', state.location.longitude.toStringAsFixed(6)),
            _buildLocationDetail('Accuracy', '±${state.location.accuracy.toStringAsFixed(1)}m'),
            _buildLocationDetail('Timestamp', _formatTimestamp(state.location.timestamp)),
            
            // Show detected office information
            BlocBuilder<LocationBloc, LocationState>(
              builder: (context, locationState) {
                if (locationState is NearestOfficeDetected) {
                  return Column(
                    children: [
                      const Divider(),
                      _buildLocationDetail('Detected Office', locationState.office.name),
                      _buildLocationDetail('Office Address', locationState.office.address),
                      _buildLocationDetail('Distance', '${(locationState.distance / 1000).toStringAsFixed(1)} km'),
                    ],
                  );
                }
                return const SizedBox.shrink();
              },
            ),
            
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: state.isValidForClockIn ? Colors.green.shade50 : Colors.orange.shade50,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: state.isValidForClockIn ? Colors.green : Colors.orange,
                ),
              ),
              child: Row(
                children: [
                  Icon(
                    state.isValidForClockIn ? Icons.check_circle : Icons.warning,
                    color: state.isValidForClockIn ? Colors.green : Colors.orange,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      state.isValidForClockIn
                          ? 'Location is valid for clock-in'
                          : 'Location is not valid for clock-in',
                      style: TextStyle(
                        color: state.isValidForClockIn ? Colors.green.shade700 : Colors.orange.shade700,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
  
  Widget _buildLocationDetail(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 80,
            child: Text(
              label,
              style: const TextStyle(
                fontWeight: FontWeight.w500,
                color: Colors.grey,
              ),
            ),
          ),
          const Text(': '),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(
                fontWeight: FontWeight.w400,
              ),
              overflow: TextOverflow.ellipsis,
              maxLines: 2,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAccuracyIndicator(double accuracy) {
    Color color;
    String label;
    IconData icon;
    
    if (accuracy <= 10) {
      color = Colors.green;
      label = 'Excellent';
      icon = Icons.gps_fixed;
    } else if (accuracy <= 50) {
      color = Colors.orange;
      label = 'Good';
      icon = Icons.gps_not_fixed;
    } else {
      color = Colors.red;
      label = 'Poor';
      icon = Icons.gps_off;
    }
    
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: color, size: 16),
          const SizedBox(width: 6),
          Text(
            'Accuracy: $label',
            style: TextStyle(
              color: color,
              fontWeight: FontWeight.w500,
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }

  String _formatTimestamp(DateTime timestamp) {
    return '${timestamp.hour.toString().padLeft(2, '0')}:${timestamp.minute.toString().padLeft(2, '0')}:${timestamp.second.toString().padLeft(2, '0')}';
  }

  void _showAlternativeClockInMethods(BuildContext context) {
    showModalBottomSheet(
      context: context,
      builder: (context) => Container(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'Alternative Clock-in Methods',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 16),
            ListTile(
              leading: const Icon(Icons.wifi, color: Colors.blue),
              title: const Text('WiFi-based Clock-in'),
              subtitle: const Text('Use office WiFi network for location verification'),
              onTap: () {
                Navigator.pop(context);
                // Navigate to WiFi clock-in
              },
            ),
            ListTile(
              leading: const Icon(Icons.qr_code, color: Colors.green),
              title: const Text('QR Code Clock-in'),
              subtitle: const Text('Scan office QR code for quick clock-in'),
              onTap: () {
                Navigator.pop(context);
                // Navigate to QR code scanner
              },
            ),
            ListTile(
              leading: const Icon(Icons.location_on, color: Colors.orange),
              title: const Text('Manual Location'),
              subtitle: const Text('Select your office location manually'),
              onTap: () {
                Navigator.pop(context);
                // Navigate to manual location selection
              },
            ),
          ],
        ),
      ),
    );
  }
}