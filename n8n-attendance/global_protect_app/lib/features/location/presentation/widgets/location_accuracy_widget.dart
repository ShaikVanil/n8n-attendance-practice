import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../domain/entities/location.dart';
import '../bloc/location_bloc.dart';
import '../bloc/location_state.dart';

class LocationAccuracyWidget extends StatelessWidget {
  final Location? location;
  final bool showDetailedInfo;
  final VoidCallback? onImproveTapped;

  const LocationAccuracyWidget({
    Key? key,
    this.location,
    this.showDetailedInfo = true,
    this.onImproveTapped,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    if (location == null) {
      return _buildNoLocationCard();
    }

    return Card(
      elevation: 2,
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildAccuracyHeader(),
            const SizedBox(height: 12),
            _buildAccuracyIndicator(),
            if (showDetailedInfo) ...[
              const SizedBox(height: 16),
              _buildLocationSource(),
              const SizedBox(height: 12),
              _buildImprovementTips(),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildNoLocationCard() {
    return Card(
      elevation: 2,
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Icon(
              Icons.location_off,
              size: 48,
              color: Colors.grey[400],
            ),
            const SizedBox(height: 8),
            Text(
              'Location Not Available',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w500,
                color: Colors.grey[600],
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'Enable location services to see accuracy information',
              style: TextStyle(
                fontSize: 14,
                color: Colors.grey[500],
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAccuracyHeader() {
    return Row(
      children: [
        Icon(
          Icons.my_location,
          color: _getAccuracyColor(),
          size: 20,
        ),
        const SizedBox(width: 8),
        Text(
          'Location Accuracy',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: Colors.grey[800],
          ),
        ),
        const Spacer(),
        Text(
          '±${location!.accuracy.toInt()}m',
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w500,
            color: _getAccuracyColor(),
          ),
        ),
      ],
    );
  }

  Widget _buildAccuracyIndicator() {
    final accuracyLevel = location!.accuracyLevel;
    final color = _getAccuracyColor();
    final label = _getAccuracyLabel();
    final icon = _getAccuracyIcon();

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Row(
        children: [
          Icon(icon, color: color, size: 24),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: color,
                  ),
                ),
                Text(
                  _getAccuracyDescription(),
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey[600],
                  ),
                ),
              ],
            ),
          ),
          _buildAccuracyMeter(),
        ],
      ),
    );
  }

  Widget _buildAccuracyMeter() {
    final accuracy = location!.accuracy;
    final progress = _calculateAccuracyProgress(accuracy);
    final color = _getAccuracyColor();

    return SizedBox(
      width: 60,
      height: 60,
      child: Stack(
        children: [
          CircularProgressIndicator(
            value: 1.0,
            strokeWidth: 6,
            backgroundColor: Colors.grey[200],
            valueColor: AlwaysStoppedAnimation<Color>(Colors.grey[200]!),
          ),
          CircularProgressIndicator(
            value: progress,
            strokeWidth: 6,
            backgroundColor: Colors.transparent,
            valueColor: AlwaysStoppedAnimation<Color>(color),
          ),
          Center(
            child: Text(
              '${(progress * 100).toInt()}%',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: color,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLocationSource() {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.grey[50],
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.grey[200]!),
      ),
      child: Row(
        children: [
          Icon(
            _getSourceIcon(),
            color: Colors.blue[600],
            size: 20,
          ),
          const SizedBox(width: 8),
          Text(
            'Source: ${location!.sourceDisplayName}',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w500,
              color: Colors.grey[700],
            ),
          ),
          if (location!.provider != null) ...[
            const SizedBox(width: 8),
            Text(
              '(${location!.provider})',
              style: TextStyle(
                fontSize: 12,
                color: Colors.grey[500],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildImprovementTips() {
    final tips = _getImprovementTips();
    if (tips.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(
              Icons.lightbulb_outline,
              color: Colors.orange[600],
              size: 18,
            ),
            const SizedBox(width: 6),
            Text(
              'Improvement Tips',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: Colors.grey[700],
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        ...tips.map((tip) => Padding(
          padding: const EdgeInsets.only(bottom: 4),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '• ',
                style: TextStyle(
                  fontSize: 12,
                  color: Colors.grey[600],
                ),
              ),
              Expanded(
                child: Text(
                  tip,
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey[600],
                  ),
                ),
              ),
            ],
          ),
        )),
        if (location!.accuracyLevel == LocationAccuracyLevel.poor) ...[
          const SizedBox(height: 8),
          _buildAlternativeMethodsButton(),
        ],
      ],
    );
  }

  Widget _buildAlternativeMethodsButton() {
    return SizedBox(
      width: double.infinity,
      child: OutlinedButton.icon(
        onPressed: onImproveTapped,
        icon: Icon(
          Icons.wifi,
          size: 16,
          color: Colors.blue[600],
        ),
        label: Text(
          'Try WiFi-based Clock-in',
          style: TextStyle(
            fontSize: 12,
            color: Colors.blue[600],
          ),
        ),
        style: OutlinedButton.styleFrom(
          padding: const EdgeInsets.symmetric(vertical: 8),
          side: BorderSide(color: Colors.blue[200]!),
        ),
      ),
    );
  }

  Color _getAccuracyColor() {
    switch (location!.accuracyLevel) {
      case LocationAccuracyLevel.excellent:
        return Colors.green;
      case LocationAccuracyLevel.good:
        return Colors.lightGreen;
      case LocationAccuracyLevel.fair:
        return Colors.orange;
      case LocationAccuracyLevel.poor:
        return Colors.red;
    }
  }

  String _getAccuracyLabel() {
    switch (location!.accuracyLevel) {
      case LocationAccuracyLevel.excellent:
        return 'Excellent';
      case LocationAccuracyLevel.good:
        return 'Good';
      case LocationAccuracyLevel.fair:
        return 'Fair';
      case LocationAccuracyLevel.poor:
        return 'Poor';
    }
  }

  IconData _getAccuracyIcon() {
    switch (location!.accuracyLevel) {
      case LocationAccuracyLevel.excellent:
        return Icons.gps_fixed;
      case LocationAccuracyLevel.good:
        return Icons.gps_not_fixed;
      case LocationAccuracyLevel.fair:
        return Icons.gps_not_fixed;
      case LocationAccuracyLevel.poor:
        return Icons.gps_off;
    }
  }

  IconData _getSourceIcon() {
    switch (location!.source) {
      case LocationSource.gps:
        return Icons.satellite_alt;
      case LocationSource.network:
        return Icons.cell_tower;
      case LocationSource.wifi:
        return Icons.wifi;
      case LocationSource.passive:
        return Icons.location_history;
      case LocationSource.fused:
        return Icons.my_location;
      case LocationSource.unknown:
        return Icons.help_outline;
    }
  }

  String _getAccuracyDescription() {
    switch (location!.accuracyLevel) {
      case LocationAccuracyLevel.excellent:
        return 'Perfect for clock-in';
      case LocationAccuracyLevel.good:
        return 'Suitable for clock-in';
      case LocationAccuracyLevel.fair:
        return 'May affect clock-in';
      case LocationAccuracyLevel.poor:
        return 'Poor for clock-in';
    }
  }

  double _calculateAccuracyProgress(double accuracy) {
    // Convert accuracy to a 0-1 scale where lower accuracy = higher progress
    if (accuracy <= 10) return 1.0;
    if (accuracy <= 50) return 0.8;
    if (accuracy <= 100) return 0.5;
    return 0.2;
  }

  List<String> _getImprovementTips() {
    final tips = <String>[];
    final accuracyLevel = location!.accuracyLevel;
    final source = location!.source;

    if (accuracyLevel == LocationAccuracyLevel.poor || 
        accuracyLevel == LocationAccuracyLevel.fair) {
      tips.add('Move to an open area with clear sky view');
      tips.add('Ensure location services are set to high accuracy');
      tips.add('Wait a few moments for GPS to stabilize');
      
      if (source != LocationSource.gps) {
        tips.add('Enable GPS for better accuracy');
      }
    }

    if (source == LocationSource.network || source == LocationSource.wifi) {
      tips.add('Connect to office WiFi for improved location detection');
    }

    if (accuracyLevel == LocationAccuracyLevel.poor) {
      tips.add('Consider using WiFi-based clock-in as an alternative');
      tips.add('Check if you\'re in a building that blocks GPS signals');
    }

    return tips;
  }
}