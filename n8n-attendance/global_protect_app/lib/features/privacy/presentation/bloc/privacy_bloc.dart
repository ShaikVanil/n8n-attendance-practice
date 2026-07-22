import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../core/usecases/usecase.dart';
import '../../domain/usecases/get_privacy_settings.dart';
import '../../domain/usecases/update_privacy_settings.dart';
import '../../domain/usecases/get_user_data.dart';
import '../../domain/usecases/request_data_deletion.dart';
import 'privacy_event.dart';
import 'privacy_state.dart';

class PrivacyBloc extends Bloc<PrivacyEvent, PrivacyState> {
  final GetPrivacySettings getPrivacySettings;
  final UpdatePrivacySettings updatePrivacySettings;
  final GetUserData getUserData;
  final RequestDataDeletion requestDataDeletion;

  PrivacyBloc({
    required this.getPrivacySettings,
    required this.updatePrivacySettings,
    required this.getUserData,
    required this.requestDataDeletion,
  }) : super(PrivacyInitial()) {
    on<LoadPrivacySettingsEvent>(_onLoadPrivacySettings);
    on<UpdateLocationSharingEvent>(_onUpdateLocationSharing);
    on<UpdateLocationAccuracyEvent>(_onUpdateLocationAccuracy);
    on<LoadUserDataEvent>(_onLoadUserData);
    on<RequestDataDeletionEvent>(_onRequestDataDeletion);
  }

  Future<void> _onLoadPrivacySettings(
    LoadPrivacySettingsEvent event,
    Emitter<PrivacyState> emit,
  ) async {
    emit(PrivacyLoading());

    final result = await getPrivacySettings(NoParams());
    result.fold(
      (failure) => emit(PrivacyError(failure.message)),
      (settings) => emit(PrivacyLoaded(settings)),
    );
  }

  Future<void> _onUpdateLocationSharing(
    UpdateLocationSharingEvent event,
    Emitter<PrivacyState> emit,
  ) async {
    if (state is PrivacyLoaded) {
      final currentState = state as PrivacyLoaded;
      final updatedSettings = currentState.settings.copyWith(
        limitLocationToWorkHours: event.limitToWorkHours,
      );

      emit(PrivacyLoaded(updatedSettings));

      final result = await updatePrivacySettings(
          UpdatePrivacySettingsParams(settings: updatedSettings));
      result.fold(
        (failure) {
          // Revert on failure
          emit(PrivacyLoaded(currentState.settings));
          emit(PrivacyError(failure.message));
        },
        (_) => {}, // Success - settings already updated in UI
      );
    }
  }

  Future<void> _onUpdateLocationAccuracy(
    UpdateLocationAccuracyEvent event,
    Emitter<PrivacyState> emit,
  ) async {
    if (state is PrivacyLoaded) {
      final currentState = state as PrivacyLoaded;
      final updatedSettings = currentState.settings.copyWith(
        useHighAccuracyLocation: event.useHighAccuracy,
      );

      emit(PrivacyLoaded(updatedSettings));

      final result = await updatePrivacySettings(
          UpdatePrivacySettingsParams(settings: updatedSettings));
      result.fold(
        (failure) {
          // Revert on failure
          emit(PrivacyLoaded(currentState.settings));
          emit(PrivacyError(failure.message));
        },
        (_) => {}, // Success - settings already updated in UI
      );
    }
  }

  Future<void> _onLoadUserData(
    LoadUserDataEvent event,
    Emitter<PrivacyState> emit,
  ) async {
    emit(PrivacyLoading());
    
    final result = await getUserData(NoParams());
    result.fold(
      (failure) => emit(PrivacyError(failure.message)),
      (userData) => emit(UserDataLoaded(userData)),
    );
  }

  Future<void> _onRequestDataDeletion(
    RequestDataDeletionEvent event,
    Emitter<PrivacyState> emit,
  ) async {
    final result = await requestDataDeletion(NoParams());
    result.fold(
      (failure) => emit(PrivacyError(failure.message)),
      (_) => emit(const DataDeletionRequested('Data deletion request submitted successfully')),
    );
  }
}
