import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../features/location/presentation/bloc/location_state.dart';
import '../../features/clock_in/presentation/bloc/wifi/wifi_state.dart';
import '../../features/clock_in/presentation/bloc/attendance/attendance_bloc.dart';
import '../../features/clock_in/presentation/bloc/attendance/attendance_event.dart';

class ClockInSharedWidgets {
  static bool canClockIn(LocationState locationState, WiFiState wifiState) {
    // Primary method: WiFi + Location
    if (wifiState is WiFiLoaded && wifiState.isOfficeNetwork && 
        locationState is LocationLoaded && locationState.isValidForClockIn) {
      return true;
    }
    
    // Fallback method: Location only
    if (locationState is LocationLoaded && locationState.isValidForClockIn) {
      return true;
    }
    
    return false;
  }

  static String getClockInButtonText(LocationState locationState, WiFiState wifiState) {
    if (wifiState is WiFiLoaded && wifiState.isOfficeNetwork && 
        locationState is LocationLoaded && locationState.isValidForClockIn) {
      return 'Clock In (WiFi + Location)';
    }
    
    if (locationState is LocationLoaded && locationState.isValidForClockIn) {
      return 'Clock In (Location Only)';
    }
    
    return 'Clock In';
  }

  static String getDisabledReason(LocationState locationState, WiFiState wifiState) {
    if (locationState is LocationError) {
      return 'Location error: ${locationState.message}';
    }
    
    if (locationState is LocationLoaded && !locationState.isValidForClockIn) {
      return 'You are not within the office location';
    }
    
    if (locationState is LocationLoading) {
      return 'Getting your location...';
    }
    
    return 'Unable to verify your location';
  }

  static void handleClockIn(BuildContext context, LocationState locationState) {
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
    }
  }
}