import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:get_it/get_it.dart';
import 'package:dio/dio.dart';
import 'package:global_protect_app/core/constants/api_constants.dart';
import 'package:global_protect_app/core/network/auth_interceptor.dart';
import 'package:global_protect_app/core/network/network_info.dart';
import 'package:global_protect_app/core/services/api_error_recovery_service.dart';
import 'package:global_protect_app/core/services/background_initialization_service.dart';
import 'package:global_protect_app/core/services/biometric_service.dart';
import 'package:global_protect_app/core/services/cache_service.dart';
import 'package:global_protect_app/core/services/data_validation_service.dart';
import 'package:global_protect_app/core/services/encryption_service.dart';
import 'package:global_protect_app/core/services/notification_service.dart';
import 'package:global_protect_app/core/services/performance_service.dart';
import 'package:global_protect_app/core/services/quick_clockin_service.dart';
import 'package:global_protect_app/core/services/reminder_service.dart';
import 'package:global_protect_app/core/services/secure_storage_service.dart';
import 'package:global_protect_app/core/services/security_audit_service.dart';
import 'package:global_protect_app/core/services/sync_service.dart';
import 'package:global_protect_app/core/services/theme_service.dart';
import 'package:global_protect_app/core/services/timezone_service.dart';
import 'package:global_protect_app/core/theme/bloc/theme_bloc.dart';
import 'package:global_protect_app/features/clock_in/data/repositories/reminder_repository_impl.dart';
import 'package:global_protect_app/features/clock_in/domain/repositories/reminder_repository.dart';
import 'package:global_protect_app/features/clock_in/domain/usecases/clock_in_usecase.dart';
import 'package:global_protect_app/features/clock_in/domain/usecases/create_reminder_usecase.dart';
import 'package:global_protect_app/features/clock_in/domain/usecases/get_smart_reminders_usecase.dart';
import 'package:global_protect_app/features/clock_in/domain/usecases/snooze_reminder_usecase.dart';
import 'package:global_protect_app/features/clock_in/presentation/bloc/reminder/reminder_bloc.dart';
import 'package:global_protect_app/features/location/domain/usecases/get_nearest_office_usecase.dart';
import 'package:global_protect_app/features/location/domain/usecases/get_office_locations_usecase.dart';
import 'package:global_protect_app/features/notifications/data/datasources/notification_local_data_source.dart';
import 'package:hive/hive.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:global_protect_app/core/services/battery_optimization_service.dart';
import 'package:global_protect_app/core/services/smart_location_service.dart';
import 'package:global_protect_app/core/services/network_optimization_service.dart';
import 'package:global_protect_app/core/services/background_task_optimization_service.dart';

// Authentication
import '../../features/authentication/data/datasources/auth_local_data_source.dart';
import '../../features/authentication/data/datasources/auth_remote_data_source.dart';
import '../../features/authentication/data/repositories/auth_repository_impl.dart';
import '../../features/authentication/data/services/token_refresh_service.dart';
import '../../features/authentication/domain/repositories/auth_repository.dart';
import '../../features/authentication/domain/usecases/login_usecase.dart';
import '../../features/authentication/domain/usecases/logout_usecase.dart';
import '../../features/authentication/domain/usecases/get_current_user_usecase.dart';
import '../../features/authentication/domain/usecases/refresh_token_usecase.dart';
import '../../features/authentication/presentation/bloc/auth_bloc.dart';

// Location
import '../../features/location/data/datasources/location_local_data_source.dart';
import '../../features/location/data/datasources/location_remote_data_source.dart';
import '../../features/location/data/repositories/location_repository_impl.dart';
import '../../features/location/domain/repositories/location_repository.dart';
import '../../features/location/domain/usecases/get_current_location_usecase.dart';
import '../../features/location/domain/usecases/request_location_permission_usecase.dart';
import '../../features/location/domain/usecases/validate_location_usecase.dart';
import '../../features/location/presentation/bloc/location_bloc.dart';

// WiFi feature imports
import '../../features/clock_in/data/datasources/wifi_local_data_source.dart';
import '../../features/clock_in/data/datasources/wifi_remote_data_source.dart';
import '../../features/clock_in/data/repositories/wifi_repository_impl.dart';
import '../../features/clock_in/domain/repositories/wifi_repository.dart';
import '../../features/clock_in/domain/usecases/get_wifi_info_usecase.dart';
import '../../features/clock_in/domain/usecases/validate_office_wifi_usecase.dart';
import '../../features/clock_in/presentation/bloc/wifi/wifi_bloc.dart';

// Attendance imports
import '../../features/clock_in/data/datasources/attendance_local_data_source.dart';
import '../../features/clock_in/data/datasources/attendance_remote_data_source.dart';
import '../../features/clock_in/data/repositories/attendance_repository_impl.dart';
import '../../features/clock_in/domain/repositories/attendance_repository.dart';
import '../../features/clock_in/domain/usecases/clock_out_usecase.dart';
import '../../features/clock_in/domain/usecases/get_current_attendance_usecase.dart';
import '../../features/clock_in/presentation/bloc/attendance/attendance_bloc.dart';

// Notifications
import '../../features/notifications/domain/repositories/notification_repository.dart';
import '../../features/notifications/data/repositories/notification_repository_impl.dart';
import '../../features/notifications/domain/usecases/show_notification.dart';
import '../../features/notifications/domain/usecases/get_notifications.dart';
import '../../features/notifications/domain/usecases/update_preferences.dart';
import '../../features/notifications/presentation/bloc/notification_bloc.dart';

// Core
import 'package:network_info_plus/network_info_plus.dart' as network;
import '../services/gps_error_recovery_service.dart';

final sl = GetIt.instance;

Future<void> init() async {
  // External dependencies
  final sharedPreferences = await SharedPreferences.getInstance();
  sl.registerLazySingleton(() => sharedPreferences);

  final secureBox = await Hive.openBox<String>('secure_storage');
  sl.registerLazySingleton<Box<String>>(() => secureBox);
  
  // Add attendance box registration with unique name
  final attendanceBox = await Hive.openBox('attendance_data');
  sl.registerLazySingleton<Box<dynamic>>(() => attendanceBox, instanceName: 'attendanceBox');
  
  // Add WiFi box registration with unique name
  final wifiBox = await Hive.openBox('wifi_data');
  sl.registerLazySingleton<Box<dynamic>>(() => wifiBox, instanceName: 'wifiBox');
  
  sl.registerLazySingleton<AuthLocalDataSource>(
    () => AuthLocalDataSourceImpl(secureBox: sl()),
  );
  
  // Register Dio with AuthInterceptor
  sl.registerLazySingleton<Dio>(() {
    final dio = Dio(BaseOptions(
      baseUrl: ApiConstants.baseUrl,
      connectTimeout: ApiConstants.connectTimeout,
      receiveTimeout: ApiConstants.receiveTimeout,
      sendTimeout: ApiConstants.sendTimeout,
    ));
    
    // Add logging interceptor
    dio.interceptors.add(LogInterceptor(
      requestBody: true,
      responseBody: true,
      requestHeader: true,
      responseHeader: false,
    ));
    
    // Add authentication interceptor
    dio.interceptors.add(AuthInterceptor(sl<AuthLocalDataSource>()));
    
    return dio;
  });
  sl.registerLazySingleton(() => Connectivity());
  // In the init() function, make sure this line exists:
  sl.registerLazySingleton<NetworkInfo>(() => NetworkInfoImpl(sl()));

  // Performance and cache services
  sl.registerLazySingleton(() => PerformanceService());
  sl.registerLazySingleton(() => CacheService(sl<SharedPreferences>()));
  sl.registerLazySingleton(() => BackgroundInitializationService());

  // Battery optimization services
  sl.registerLazySingleton(() => BatteryOptimizationService());
  sl.registerLazySingleton(() => SmartLocationService());
  sl.registerLazySingleton(() => NetworkOptimizationService());
  sl.registerLazySingleton(() => BackgroundTaskOptimizationService());

  // Initialize battery service
  await sl<BatteryOptimizationService>().initialize();
  sl<BackgroundTaskOptimizationService>().initialize();

  // Security services
  sl.registerLazySingleton(() => EncryptionService());
  sl.registerLazySingleton(() => SecureStorageService(sl<EncryptionService>()));
  sl.registerLazySingleton(
      () => SecurityAuditService(sl<SecureStorageService>()));
  sl.registerLazySingleton(() => BiometricService());

  // Other services
  sl.registerLazySingleton(() => QuickClockInService(sl<BiometricService>()));
  sl.registerLazySingleton(() => DataValidationService());
  sl.registerLazySingleton(() => APIErrorRecoveryService());

  await _initThemeService();
  await _initTimeZone();

  // WiFi feature
  _initWiFi();

  // Authentication feature
  _initAuth();

  // Clock-in feature
  _initAttendance();

  // Location feature
  _initLocation();

  // Reminder Feature
  _initReminders();

  // Notification Feature
  _initNotifications();
}

Future<void> _initThemeService() async{
  // Initialize ThemeService synchronously during init
  final themeService = ThemeService();
  await themeService.init();
  sl.registerLazySingleton<ThemeService>(() => themeService);
  
  // Register ThemeBloc as regular factory (not async)
  sl.registerFactory<ThemeBloc>(() => ThemeBloc(sl<ThemeService>()));
}

void _initNotifications() {
  // Notification Feature
  sl.registerLazySingleton(() => FlutterLocalNotificationsPlugin());

  sl.registerLazySingleton<NotificationService>(
    () => NotificationService(
      flutterLocalNotificationsPlugin: sl(),
      repository: sl(),
    ),
  );

  sl.registerLazySingleton<NotificationRepository>(
    () => NotificationRepositoryImpl(sl()),
  );

  sl.registerLazySingleton<NotificationLocalDataSource>(
    () => NotificationLocalDataSourceImpl(sl()),
  );

  // Notification Use Cases
  sl.registerLazySingleton(() => ShowNotification(
        repository: sl(),
        notificationService: sl(),
      ));

  sl.registerLazySingleton(() => GetNotifications(sl()));
  sl.registerLazySingleton(() => UpdateNotificationPreferences(sl()));

  // Notification Bloc
  sl.registerFactory(() => NotificationBloc(
      showNotification: sl(),
      getNotifications: sl(),
      repository: sl(),
      updatePreferences: sl()));
}

void _initReminders() {
  sl.registerLazySingleton<ReminderService>(
    () => ReminderService(
      notificationsPlugin: sl(),
      prefs: sl(),
    ),
  );

  // Reminder Repository
  sl.registerLazySingleton<ReminderRepository>(
    () => ReminderRepositoryImpl(
      remoteDataSource: sl(),
      localDataSource: sl(),
      networkInfo: sl(),
    ),
  );

  // Reminder Use Cases
  sl.registerLazySingleton(() => CreateReminderUseCase(sl()));
  sl.registerLazySingleton(() => GetSmartRemindersUseCase(sl()));
  sl.registerLazySingleton(() => SnoozeReminderUseCase(sl()));

  // Reminder Bloc
  sl.registerFactory(
    () => ReminderBloc(
        createReminderUseCase: sl(),
        getSmartRemindersUseCase: sl(),
        snoozeReminderUseCase: sl(),
        reminderService: sl(),
        attendanceRepository: sl(),
        getCurrentUserUseCase: sl(),
        prefs: sl()),
  );
}

void _initAttendance() {
  // Data sources
  sl.registerLazySingleton<AttendanceLocalDataSource>(
    () => AttendanceLocalDataSourceImpl(box: sl(instanceName: 'attendanceBox')),
  );

  sl.registerLazySingleton<AttendanceRemoteDataSource>(
    () => AttendanceRemoteDataSourceImpl(dio: sl()),
  );

  // Repository (must come before use cases)
  sl.registerLazySingleton<AttendanceRepository>(
    () => AttendanceRepositoryImpl(
      remoteDataSource: sl(),
      localDataSource: sl(),
      networkInfo: sl(),
      syncService: sl(),
    ),
  );

  // Use cases (after repository)
  sl.registerLazySingleton(() => ClockInUseCase(sl()));
  sl.registerLazySingleton(() => ClockOutUseCase(sl()));
  sl.registerLazySingleton(() => GetCurrentAttendanceUseCase(sl()));

  // Sync Service
  sl.registerLazySingleton<SyncService>(
    () => SyncService(
      localDataSource: sl(),
      remoteDataSource: sl(),
      networkInfo: sl(),
      notificationService: sl(),
    ),
  );

  // BLoC
  sl.registerFactory(
    () => AttendanceBloc(
        clockInUseCase: sl(),
        clockOutUseCase: sl(),
        getCurrentAttendanceUseCase: sl(),
        networkInfo: sl(),
        syncService: sl(),
        notificationService: sl(),
        attendanceRepository: sl(),
        validationService: sl()),
  );
}

void _initWiFi() {
  // Data sources first
  sl.registerLazySingleton<WiFiLocalDataSource>(
    () => WiFiLocalDataSourceImpl(box: sl(instanceName: 'wifiBox')),
  );

  sl.registerLazySingleton<WiFiRemoteDataSource>(
    () => WiFiRemoteDataSourceImpl(networkInfo: network.NetworkInfo(), dio: sl()),
  );

  // Repository (after data sources)
  sl.registerLazySingleton<WiFiRepository>(
    () => WiFiRepositoryImpl(
      remoteDataSource: sl(),
      localDataSource: sl(),
    ),
  );

  // Use cases (after repository)
  sl.registerLazySingleton(() => GetWiFiInfoUseCase(sl()));
  sl.registerLazySingleton(() => ValidateOfficeWiFiUseCase(sl()));

  // BLoC (last)
  sl.registerFactory(
    () => WiFiBloc(
      wifiRepository: sl(),
      getWiFiInfoUseCase: sl(),
      validateOfficeWiFiUseCase: sl(),
    ),
  );
}

void _initAuth() {
  // Data sources first
  sl.registerLazySingleton<AuthRemoteDataSource>(
    () => AuthRemoteDataSourceImpl(
      dio: sl(),
      errorRecoveryService: sl(),
    ),
  );

  // Repository (without TokenRefreshService dependency to avoid circular dependency)
  sl.registerLazySingleton<AuthRepository>(
    () => AuthRepositoryImpl(
      remoteDataSource: sl<AuthRemoteDataSource>(),
      localDataSource: sl<AuthLocalDataSource>(),
      networkInfo: sl<NetworkInfo>(),
    ),
  );

  // Use cases (register before TokenRefreshService and AuthBloc)
  sl.registerLazySingleton(() => LoginUseCase(sl<AuthRepository>()));
  sl.registerLazySingleton(() => LogoutUseCase(sl<AuthRepository>()));
  sl.registerLazySingleton(() => GetCurrentUserUseCase(sl<AuthRepository>()));
  sl.registerLazySingleton(() => RefreshTokenUseCase(sl<AuthRepository>()));

  // Services (after repository and use cases)
  sl.registerLazySingleton<TokenRefreshService>(
    () => TokenRefreshService(
      authRepository: sl<AuthRepository>(), 
      networkInfo: sl<NetworkInfo>()
    ),
  );

  // BLoC (register last, after all dependencies)
  sl.registerFactory(
    () => AuthBloc(
      loginUseCase: sl<LoginUseCase>(),
      logoutUseCase: sl<LogoutUseCase>(),
      getCurrentUserUseCase: sl<GetCurrentUserUseCase>(),
      refreshTokenUseCase: sl<RefreshTokenUseCase>(),
      tokenRefreshService: sl<TokenRefreshService>(),
    ),
  );
}

void _initLocation() {
  // BLoC
  sl.registerFactory(
    () => LocationBloc(
      getCurrentLocationUseCase: sl(),
      requestLocationPermissionUseCase: sl(),
      validateLocationUseCase: sl(),
      getNearestOfficeUseCase: sl()
    ),
  );

  // Use cases
  sl.registerLazySingleton(() => GetCurrentLocationUseCase(sl()));
  sl.registerLazySingleton(() => RequestLocationPermissionUseCase(sl()));
  sl.registerLazySingleton(() => ValidateLocationUseCase(sl()));
  sl.registerLazySingleton(() => GetOfficeLocationsUseCase(sl()));
  sl.registerLazySingleton(() => GetNearestOfficeUseCase(sl()));

  // Repository
  sl.registerLazySingleton<LocationRepository>(
    () => LocationRepositoryImpl(
      localDataSource: sl(),
      remoteDataSource: sl(),
    ),
  );

  // Data sources
  sl.registerLazySingleton<LocationLocalDataSource>(
    () => LocationLocalDataSourceImpl(),
  );

  sl.registerLazySingleton<LocationRemoteDataSource>(
    () => LocationRemoteDataSourceImpl(dio: sl()),
  );

  // GPS Error Recovery Service
  sl.registerLazySingleton<GPSErrorRecoveryService>(
      () => GPSErrorRecoveryService());
}

Future<void> _initTimeZone() async {
  // Register TimezoneService
  sl.registerLazySingleton<TimezoneService>(() => TimezoneService());
  
  // Initialize timezone service
  await sl<TimezoneService>().initialize();
}
