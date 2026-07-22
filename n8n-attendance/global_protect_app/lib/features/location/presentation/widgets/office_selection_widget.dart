import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../domain/entities/office_location.dart';
import '../bloc/location_bloc.dart';

class OfficeSelectionWidget extends StatelessWidget {
  final List<OfficeLocation> offices;
  final OfficeLocation? selectedOffice;
  final Function(OfficeLocation) onOfficeSelected;

  const OfficeSelectionWidget({
    Key? key,
    required this.offices,
    this.selectedOffice,
    required this.onOfficeSelected,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
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
                  Icons.business,
                  color: Theme.of(context).primaryColor,
                ),
                const SizedBox(width: 8),
                Text(
                  'Select Office Location',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            ...offices.map((office) => _buildOfficeOption(context, office)),
          ],
        ),
      ),
    );
  }

  Widget _buildOfficeOption(BuildContext context, OfficeLocation office) {
    final isSelected = selectedOffice?.id == office.id;
    final distance = office.distanceFromUser;
    
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        border: Border.all(
          color: isSelected ? Theme.of(context).primaryColor : Colors.grey.shade300,
          width: isSelected ? 2 : 1,
        ),
        borderRadius: BorderRadius.circular(8),
        color: isSelected ? Theme.of(context).primaryColor.withOpacity(0.1) : null,
      ),
      child: ListTile(
        leading: Icon(
          Icons.location_on,
          color: isSelected ? Theme.of(context).primaryColor : Colors.grey,
        ),
        title: Text(
          office.name,
          style: TextStyle(
            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
            color: isSelected ? Theme.of(context).primaryColor : null,
          ),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(office.address),
            if (distance != null)
              Text(
                '${(distance / 1000).toStringAsFixed(1)} km away',
                style: TextStyle(
                  color: Colors.grey.shade600,
                  fontSize: 12,
                ),
              ),
          ],
        ),
        trailing: isSelected
            ? Icon(
                Icons.check_circle,
                color: Theme.of(context).primaryColor,
              )
            : null,
        onTap: () => onOfficeSelected(office),
      ),
    );
  }
}