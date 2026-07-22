import 'package:equatable/equatable.dart';
import '../../domain/entities/privacy_settings.dart';
import '../../domain/entities/user_data.dart';

abstract class PrivacyState extends Equatable {
  const PrivacyState();

  @override
  List<Object?> get props => [];
}

class PrivacyInitial extends PrivacyState {}

class PrivacyLoading extends PrivacyState {}

class PrivacyLoaded extends PrivacyState {
  final PrivacySettings settings;

  const PrivacyLoaded(this.settings);

  @override
  List<Object?> get props => [settings];
}

class UserDataLoaded extends PrivacyState {
  final UserData userData;

  const UserDataLoaded(this.userData);

  @override
  List<Object?> get props => [userData];
}

class PrivacyError extends PrivacyState {
  final String message;

  const PrivacyError(this.message);

  @override
  List<Object?> get props => [message];
}

class DataDeletionRequested extends PrivacyState {
  final String message;

  const DataDeletionRequested(this.message);

  @override
  List<Object?> get props => [message];
}