import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:global_protect_app/features/clock_in/presentation/widgets/confirmation_dialog.dart';
import '../../../../core/services/data_validation_service.dart';
import '../bloc/attendance/attendance_bloc.dart';
import '../bloc/attendance/attendance_event.dart';
import '../bloc/attendance/attendance_state.dart';
import 'validated_text_field.dart';

class EnhancedClockInForm extends StatefulWidget {
  final String currentLocation;
  final VoidCallback? onSuccess;

  const EnhancedClockInForm({
    super.key,
    required this.currentLocation,
    this.onSuccess,
  });

  @override
  State<EnhancedClockInForm> createState() => _EnhancedClockInFormState();
}

class _EnhancedClockInFormState extends State<EnhancedClockInForm> {
  final _formKey = GlobalKey<FormState>();
  final _notesController = TextEditingController();
  final _validationService = DataValidationService();
  bool _isValidating = false;

  @override
  void initState() {
    super.initState();
  }

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _handleClockIn() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isValidating = true;
    });

    // Trigger validation in the bloc
    context.read<AttendanceBloc>().add(
      ValidateClockInDataEvent(
        location: widget.currentLocation,
        notes: _notesController.text.trim().isEmpty 
          ? null 
          : _notesController.text.trim(),
      ),
    );
  }

  void _handleValidationWarning(AttendanceValidationWarning state) {
    ConfirmationDialog.show(
      context: context,
      title: 'Confirm Clock-In',
      message: state.message,
      suggestion: state.suggestion,
      onConfirm: () {
        context.read<AttendanceBloc>().add(
          ConfirmUnusualPatternEvent(
            confirmationType: 'clock_in_warning',
            confirmationData: state.confirmationData,
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<AttendanceBloc, AttendanceState>(
      listener: (context, state) {
        if (state is AttendanceValidationError) {
          setState(() {
            _isValidating = false;
          });
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(state.message),
              backgroundColor: state.severity == ValidationSeverity.warning 
                ? Colors.orange 
                : Colors.red,
              action: state.suggestion != null
                ? SnackBarAction(
                    label: 'Info',
                    onPressed: () {
                      showDialog(
                        context: context,
                        builder: (context) => AlertDialog(
                          title: const Text('Suggestion'),
                          content: Text(state.suggestion!),
                          actions: [
                            TextButton(
                              onPressed: () => Navigator.of(context).pop(),
                              child: const Text('OK'),
                            ),
                          ],
                        ),
                      );
                    },
                  )
                : null,
            ),
          );
        } else if (state is AttendanceValidationWarning) {
          setState(() {
            _isValidating = false;
          });
          _handleValidationWarning(state);
        } else if (state is AttendanceValidationSuccess) {
          setState(() {
            _isValidating = false;
          });
          // Proceed with actual clock-in
          context.read<AttendanceBloc>().add(
            ClockInEvent(
              location: widget.currentLocation,
              notes: _notesController.text.trim().isEmpty 
                ? null 
                : _notesController.text.trim(),
            ),
          );
        } else if (state is AttendanceLoaded && state.isClockedIn) {
          widget.onSuccess?.call();
        }
      },
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Location Display
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Current Location',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        const Icon(Icons.location_on, color: Colors.green),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            widget.currentLocation,
                            style: const TextStyle(fontFamily: 'monospace'),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            
            // Notes Field with Real-time Validation
            ValidatedTextField(
              label: 'Notes',
              hint: 'Optional notes about your clock-in',
              controller: _notesController,
              validator: _validationService.validateNotesInput,
              keyboardType: TextInputType.multiline,
              maxLines: 3,
              maxLength: 500,
              prefixIcon: const Icon(Icons.note_add),
            ),
            const SizedBox(height: 24),
            
            // Clock-In Button
            ElevatedButton(
              onPressed: _isValidating ? null : _handleClockIn,
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: _isValidating
                ? const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ),
                      SizedBox(width: 12),
                      Text('Validating...'),
                    ],
                  )
                : const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.login),
                      SizedBox(width: 8),
                      Text('Clock In'),
                    ],
                  ),
            ),
          ],
        ),
      ),
    );
  }
}