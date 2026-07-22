import 'package:equatable/equatable.dart';

class WorkPattern extends Equatable {
  final String userId;
  final List<DateTime> clockInTimes;
  final Duration averageWorkDuration;
  final DateTime? suggestedClockOutTime;
  final double confidence;

  const WorkPattern({
    required this.userId,
    required this.clockInTimes,
    required this.averageWorkDuration,
    this.suggestedClockOutTime,
    required this.confidence,
  });

  @override
  List<Object?> get props => [
        userId,
        clockInTimes,
        averageWorkDuration,
        suggestedClockOutTime,
        confidence,
      ];
}