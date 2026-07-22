import 'package:flutter/material.dart';
import '../../../../core/services/data_validation_service.dart';

class ValidatedTextField extends StatefulWidget {
  final String label;
  final String? hint;
  final TextEditingController controller;
  final ValidationResult Function(String) validator;
  final TextInputType keyboardType;
  final int? maxLines;
  final int? maxLength;
  final bool required;
  final Widget? prefixIcon;

  const ValidatedTextField({
    super.key,
    required this.label,
    this.hint,
    required this.controller,
    required this.validator,
    this.keyboardType = TextInputType.text,
    this.maxLines = 1,
    this.maxLength,
    this.required = false,
    this.prefixIcon,
  });

  @override
  State<ValidatedTextField> createState() => _ValidatedTextFieldState();
}

class _ValidatedTextFieldState extends State<ValidatedTextField> {
  ValidationResult? _validationResult;
  bool _hasBeenTouched = false;

  @override
  void initState() {
    super.initState();
    widget.controller.addListener(_onTextChanged);
  }

  @override
  void dispose() {
    widget.controller.removeListener(_onTextChanged);
    super.dispose();
  }

  void _onTextChanged() {
    if (_hasBeenTouched) {
      setState(() {
        _validationResult = widget.validator(widget.controller.text);
      });
    }
  }

  void _onFocusLost() {
    setState(() {
      _hasBeenTouched = true;
      _validationResult = widget.validator(widget.controller.text);
    });
  }

  @override
  Widget build(BuildContext context) {
    final hasError = _validationResult != null && !_validationResult!.isValid;
    final isWarning = _validationResult?.severity == ValidationSeverity.warning;
    
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Focus(
          onFocusChange: (hasFocus) {
            if (!hasFocus) _onFocusLost();
          },
          child: TextFormField(
            controller: widget.controller,
            keyboardType: widget.keyboardType,
            maxLines: widget.maxLines,
            maxLength: widget.maxLength,
            decoration: InputDecoration(
              labelText: widget.required ? '${widget.label} *' : widget.label,
              hintText: widget.hint,
              prefixIcon: widget.prefixIcon,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(
                  color: hasError 
                    ? (isWarning ? Colors.orange : Colors.red)
                    : Colors.grey.shade300,
                ),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(
                  color: hasError 
                    ? (isWarning ? Colors.orange : Colors.red)
                    : Theme.of(context).primaryColor,
                  width: 2,
                ),
              ),
              errorBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(
                  color: isWarning ? Colors.orange : Colors.red,
                ),
              ),
              suffixIcon: _validationResult != null
                ? Icon(
                    _validationResult!.isValid
                      ? Icons.check_circle
                      : (isWarning ? Icons.warning : Icons.error),
                    color: _validationResult!.isValid
                      ? Colors.green
                      : (isWarning ? Colors.orange : Colors.red),
                  )
                : null,
            ),
          ),
        ),
        if (_validationResult != null && !_validationResult!.isValid) ...[
          const SizedBox(height: 4),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(
                isWarning ? Icons.warning_amber : Icons.error_outline,
                size: 16,
                color: isWarning ? Colors.orange : Colors.red,
              ),
              const SizedBox(width: 4),
              Expanded(
                child: Text(
                  _validationResult!.errorMessage!,
                  style: TextStyle(
                    color: isWarning ? Colors.orange : Colors.red,
                    fontSize: 12,
                  ),
                ),
              ),
            ],
          ),
          if (_validationResult!.suggestion != null) ...[
            const SizedBox(height: 2),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(
                  Icons.lightbulb_outline,
                  size: 16,
                  color: Colors.blue,
                ),
                const SizedBox(width: 4),
                Expanded(
                  child: Text(
                    _validationResult!.suggestion!,
                    style: const TextStyle(
                      color: Colors.blue,
                      fontSize: 11,
                      fontStyle: FontStyle.italic,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ],
      ],
    );
  }
}