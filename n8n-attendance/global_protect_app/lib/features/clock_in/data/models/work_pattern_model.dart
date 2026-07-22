import 'package:flutter/material.dart';
import 'package:global_protect_app/features/clock_in/domain/entities/reminder.dart';

class WorkPatternModel extends WorkPattern {
  const WorkPatternModel({
    required super.userId,
    required super.clockOutTimes,
    required super.clockInTimes,
    required super.averageWorkDuration,
    required super.suggestedClockOutTime,
    required super.confidence,
  });

  factory WorkPatternModel.fromJson(Map<String, dynamic> json) {
    return WorkPatternModel(
      userId: json['userId'] as String,
      clockInTimes: (json['clockInTimes'] as List<dynamic>)
          .map((time) => (DateTime.parse(time as String)))
          .toList(),
      clockOutTimes: (json['clockOutTimes'] as List<dynamic>)
          .map((time) => (DateTime.parse(time as String)))
          .toList(),
      averageWorkDuration: Duration(
        milliseconds: json['averageWorkDurationMs'] as int,
      ),
      suggestedClockOutTime: (json['suggestedClockOutTime'] != null)
          ? TimeOfDay.fromDateTime(DateTime.parse(['suggestedClockOutTime'] as String))
          : TimeOfDay(hour: 0, minute: 0),
      confidence: (json['confidence'] as num).toDouble(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'userId': userId,
      'clockInTimes':
          clockInTimes.map((time) => DateTime(
                DateTime.now().year,
                DateTime.now().month,
                DateTime.now().day,
                time?.hour ?? 0,
                time?.minute ?? 0,
              ).toIso8601String()).toList(),
      'clockOutTimes':
          clockOutTimes.map((time) => DateTime(
                DateTime.now().year,
                DateTime.now().month,
                DateTime.now().day,
                time?.hour ?? 0,
                time?.minute ?? 0,
              ).toIso8601String()).toList(),
      'averageWorkDurationMs': averageWorkDuration.inMilliseconds,
      'suggestedClockOutTime': suggestedClockOutTime?.toString(),
      'confidence': confidence,
    };
  }

  factory WorkPatternModel.fromEntity(WorkPattern entity) {
    return WorkPatternModel(
      userId: entity.userId,
      clockOutTimes: entity.clockOutTimes,
      clockInTimes: entity.clockInTimes,
      averageWorkDuration: entity.averageWorkDuration,
      suggestedClockOutTime: entity.suggestedClockOutTime,
      confidence: entity.confidence,
    );
  }

  WorkPattern toEntity() {
    return WorkPattern(
      userId: userId,
      clockInTimes: clockInTimes,
      clockOutTimes: clockOutTimes,
      averageWorkDuration: averageWorkDuration,
      suggestedClockOutTime: suggestedClockOutTime,
      confidence: confidence,
    );
  }
}
