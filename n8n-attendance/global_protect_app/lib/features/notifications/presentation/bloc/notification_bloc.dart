import 'dart:async';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../domain/entities/notification.dart';
import '../../domain/repositories/notification_repository.dart';
import '../../domain/usecases/get_notifications.dart';
import '../../domain/usecases/show_notification.dart';
import '../../domain/usecases/update_preferences.dart';
import 'notification_event.dart';
import 'notification_state.dart';

class NotificationBloc extends Bloc<NotificationEvent, NotificationState> {
  final GetNotifications _getNotifications;
  final ShowNotification _showNotification;
  final UpdateNotificationPreferences _updatePreferences;
  final NotificationRepository _repository;
  
  StreamSubscription<AppNotification>? _notificationSubscription;

  NotificationBloc({
    required GetNotifications getNotifications,
    required ShowNotification showNotification,
    required UpdateNotificationPreferences updatePreferences,
    required NotificationRepository repository,
  }) : _getNotifications = getNotifications,
       _showNotification = showNotification,
       _updatePreferences = updatePreferences,
       _repository = repository,
       super(NotificationInitial()) {
    on<LoadNotificationsEvent>(_onLoadNotifications);
    on<LoadUnreadNotificationsEvent>(_onLoadUnreadNotifications);
    on<MarkNotificationAsReadEvent>(_onMarkNotificationAsRead);
    on<MarkAllNotificationsAsReadEvent>(_onMarkAllNotificationsAsRead);
    on<DeleteNotificationEvent>(_onDeleteNotification);
    on<ClearAllNotificationsEvent>(_onClearAllNotifications);
    on<LoadNotificationPreferencesEvent>(_onLoadNotificationPreferences);
    on<UpdateNotificationPreferencesEvent>(_onUpdateNotificationPreferences);
    on<NotificationReceivedEvent>(_onNotificationReceived);
    
    _initializeNotificationStream();
  }
  
  void _initializeNotificationStream() {
    _notificationSubscription = _repository.notificationStream.listen(
      (notification) {
        add(NotificationReceivedEvent(notification));
      },
    );
  }

  Future<void> _onLoadNotifications(
    LoadNotificationsEvent event,
    Emitter<NotificationState> emit,
  ) async {
    try {
      emit(NotificationLoading());
      
      final notifications = await _getNotifications(
        GetNotificationsParams(limit: event.limit, offset: event.offset),
      );
      
      final unreadNotifications = await _repository.getUnreadNotifications();
      final preferences = await _repository.getPreferences();
      
      emit(NotificationsLoaded(
        notifications: notifications.fold(
          (failure) => [],
          (notifications) => notifications,
        ),
        unreadNotifications: unreadNotifications,
        preferences: preferences,
      ));
    } catch (e) {
      emit(NotificationError('Failed to load notifications: $e'));
    }
  }

  Future<void> _onLoadUnreadNotifications(
    LoadUnreadNotificationsEvent event,
    Emitter<NotificationState> emit,
  ) async {
    try {
      final unreadNotifications = await _repository.getUnreadNotifications();
      
      if (state is NotificationsLoaded) {
        final currentState = state as NotificationsLoaded;
        emit(currentState.copyWith(unreadNotifications: unreadNotifications));
      }
    } catch (e) {
      emit(NotificationError('Failed to load unread notifications: $e'));
    }
  }

  Future<void> _onMarkNotificationAsRead(
    MarkNotificationAsReadEvent event,
    Emitter<NotificationState> emit,
  ) async {
    try {
      await _repository.markAsRead(event.notificationId);
      add(LoadNotificationsEvent());
    } catch (e) {
      emit(NotificationError('Failed to mark notification as read: $e'));
    }
  }

  Future<void> _onMarkAllNotificationsAsRead(
    MarkAllNotificationsAsReadEvent event,
    Emitter<NotificationState> emit,
  ) async {
    try {
      await _repository.markAllAsRead();
      add(LoadNotificationsEvent());
    } catch (e) {
      emit(NotificationError('Failed to mark all notifications as read: $e'));
    }
  }

  Future<void> _onDeleteNotification(
    DeleteNotificationEvent event,
    Emitter<NotificationState> emit,
  ) async {
    try {
      await _repository.deleteNotification(event.notificationId);
      add(LoadNotificationsEvent());
    } catch (e) {
      emit(NotificationError('Failed to delete notification: $e'));
    }
  }

  Future<void> _onClearAllNotifications(
    ClearAllNotificationsEvent event,
    Emitter<NotificationState> emit,
  ) async {
    try {
      await _repository.clearAllNotifications();
      add(LoadNotificationsEvent());
    } catch (e) {
      emit(NotificationError('Failed to clear notifications: $e'));
    }
  }

  Future<void> _onLoadNotificationPreferences(
    LoadNotificationPreferencesEvent event,
    Emitter<NotificationState> emit,
  ) async {
    try {
      final preferences = await _repository.getPreferences();
      
      if (state is NotificationsLoaded) {
        final currentState = state as NotificationsLoaded;
        emit(currentState.copyWith(preferences: preferences));
      }
    } catch (e) {
      emit(NotificationError('Failed to load preferences: $e'));
    }
  }

  Future<void> _onUpdateNotificationPreferences(
    UpdateNotificationPreferencesEvent event,
    Emitter<NotificationState> emit,
  ) async {
    try {
      await _updatePreferences(
        UpdateNotificationPreferencesParams(preferences: event.preferences),
      );
      
      emit(NotificationPreferencesUpdated(event.preferences));
      add(LoadNotificationPreferencesEvent());
    } catch (e) {
      emit(NotificationError('Failed to update preferences: $e'));
    }
  }

  Future<void> _onNotificationReceived(
    NotificationReceivedEvent event,
    Emitter<NotificationState> emit,
  ) async {
    // Refresh notifications when a new one is received
    add(LoadNotificationsEvent());
  }

  @override
  Future<void> close() {
    _notificationSubscription?.cancel();
    return super.close();
  }
}