class OfflineClockInRequest {
  final String id;
  final String type; // 'clock_in' or 'clock_out'
  final String location;
  final String? notes;
  final String? attendanceId; // For clock-out requests
  final DateTime timestamp;
  final Map<String, dynamic> additionalData;
  final int retryCount;
  final DateTime createdAt;
  final OfflineRequestStatus status;

  const OfflineClockInRequest({
    required this.id,
    required this.type,
    required this.location,
    this.notes,
    this.attendanceId,
    required this.timestamp,
    required this.additionalData,
    this.retryCount = 0,
    required this.createdAt,
    this.status = OfflineRequestStatus.pending,
  });

  OfflineClockInRequest copyWith({
    String? id,
    String? type,
    String? location,
    String? notes,
    String? attendanceId,
    DateTime? timestamp,
    Map<String, dynamic>? additionalData,
    int? retryCount,
    DateTime? createdAt,
    OfflineRequestStatus? status,
  }) {
    return OfflineClockInRequest(
      id: id ?? this.id,
      type: type ?? this.type,
      location: location ?? this.location,
      notes: notes ?? this.notes,
      attendanceId: attendanceId ?? this.attendanceId,
      timestamp: timestamp ?? this.timestamp,
      additionalData: additionalData ?? this.additionalData,
      retryCount: retryCount ?? this.retryCount,
      createdAt: createdAt ?? this.createdAt,
      status: status ?? this.status,
    );
  }

  bool get isClockIn => type == 'clock_in';
  bool get isClockOut => type == 'clock_out';
  bool get canRetry => retryCount < 3 && status == OfflineRequestStatus.failed;
}

enum OfflineRequestStatus {
  pending,
  syncing,
  completed,
  failed,
}