import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../bloc/wifi/wifi_bloc.dart';
import '../bloc/wifi/wifi_event.dart';
import '../bloc/wifi/wifi_state.dart';

class WiFiStatusWidget extends StatelessWidget {
  final VoidCallback? onOfficeNetworkDetected;
  final VoidCallback? onNonOfficeNetwork;
  
  const WiFiStatusWidget({
    super.key,
    this.onOfficeNetworkDetected,
    this.onNonOfficeNetwork,
  });

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<WiFiBloc, WiFiState>(
      listener: (context, state) {
        if (state is WiFiValidationSuccess) {
          onOfficeNetworkDetected?.call();
        } else if (state is WiFiValidationFailure) {
          onNonOfficeNetwork?.call();
        }
      },
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
                    Icon(
                      Icons.wifi,
                      color: _getWiFiIconColor(state),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'WiFi Status',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const Spacer(),
                    IconButton(
                      icon: const Icon(Icons.refresh),
                      onPressed: () {
                        context.read<WiFiBloc>().add(GetCurrentWiFiEvent());
                      },
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                _buildStatusContent(context, state),
              ],
            ),
          ),
        );
      },
    );
  }

  Color _getWiFiIconColor(WiFiState state) {
    if (state is WiFiLoaded) {
      if (state.wifiInfo.isConnected && state.isOfficeNetwork) {
        return Colors.green;
      } else if (state.wifiInfo.isConnected) {
        return Colors.orange;
      }
    } else if (state is WiFiValidationSuccess) {
      return Colors.green;
    } else if (state is WiFiValidationFailure) {
      return Colors.red;
    }
    return Colors.grey;
  }

  Widget _buildStatusContent(BuildContext context, WiFiState state) {
    if (state is WiFiLoading) {
      return const Row(
        children: [
          SizedBox(
            width: 16,
            height: 16,
            child: CircularProgressIndicator(strokeWidth: 2),
          ),
          SizedBox(width: 12),
          Text('Checking WiFi status...'),
        ],
      );
    }

    if (state is WiFiPermissionRequired) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            state.message,
            style: const TextStyle(color: Colors.orange),
          ),
          const SizedBox(height: 8),
          ElevatedButton(
            onPressed: () {
              context.read<WiFiBloc>().add(RequestWiFiPermissionEvent());
            },
            child: const Text('Grant Permission'),
          ),
        ],
      );
    }

    if (state is WiFiPermissionDenied) {
      return Text(
        state.message,
        style: const TextStyle(color: Colors.red),
      );
    }

    if (state is WiFiLoaded) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (state.wifiInfo.isConnected) ...
            _buildConnectedInfo(context, state)
          else
            const Text(
              'Not connected to WiFi',
              style: TextStyle(color: Colors.grey),
            ),
          const SizedBox(height: 8),
          ElevatedButton(
            onPressed: () {
              context.read<WiFiBloc>().add(ValidateOfficeWiFiEvent());
            },
            child: const Text('Validate for Clock-In'),
          ),
        ],
      );
    }

    if (state is WiFiValidationSuccess) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.check_circle, color: Colors.green),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Connected to office network: ${state.networkName}',
                  style: const TextStyle(color: Colors.green),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          const Text(
            'You can clock in using WiFi verification',
            style: TextStyle(fontSize: 12, color: Colors.grey),
          ),
        ],
      );
    }

    if (state is WiFiValidationFailure) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.error, color: Colors.red),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  state.message,
                  style: const TextStyle(color: Colors.red),
                ),
              ),
            ],
          ),
          if (state.wifiInfo?.ssid != null) ...[
            const SizedBox(height: 8),
            Text(
              'Current network: ${state.wifiInfo!.ssid}',
              style: const TextStyle(fontSize: 12, color: Colors.grey),
            ),
          ],
        ],
      );
    }

    if (state is WiFiError) {
      return Text(
        'Error: ${state.message}',
        style: const TextStyle(color: Colors.red),
      );
    }

    return const Text('Tap refresh to check WiFi status');
  }

  List<Widget> _buildConnectedInfo(BuildContext context, WiFiLoaded state) {
    return [
      Row(
        children: [
          Icon(
            state.isOfficeNetwork ? Icons.business : Icons.wifi,
            color: state.isOfficeNetwork ? Colors.green : Colors.orange,
            size: 16,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              'Connected to: ${state.wifiInfo.ssid}',
              style: TextStyle(
                color: state.isOfficeNetwork ? Colors.green : Colors.orange,
                fontWeight: FontWeight.w500,
              ),
              overflow: TextOverflow.ellipsis,
              maxLines: 1,
            ),
          ),
        ],
      ),
      if (state.isOfficeNetwork)
        const Padding(
          padding: EdgeInsets.only(top: 4),
          child: Text(
            '✓ Office network detected',
            style: TextStyle(
              fontSize: 12,
              color: Colors.green,
            ),
          ),
        )
      else
        const Padding(
          padding: EdgeInsets.only(top: 4),
          child: Text(
            '⚠ Not an office network',
            style: TextStyle(
              fontSize: 12,
              color: Colors.orange,
            ),
          ),
        ),
    ];
  }
}