# Flutter Clock-In App - Technical Architecture Document

## 1. Architecture Overview

### 1.1 High-Level Architecture

┌─────────────────────────────────────────────────────────────┐
│                    Flutter Mobile App                       │
├─────────────────────────────────────────────────────────────┤
│  Presentation Layer (UI)                                   │
│  ├── Screens (Login, Clock-In, Status)                     │
│  ├── Widgets (Custom Components)                           │
│  └── Themes (Material/Cupertino)                           │
├─────────────────────────────────────────────────────────────┤
│  Business Logic Layer (BLoC)                               │
│  ├── Authentication BLoC                                   │
│  ├── Clock-In BLoC                                         │
│  ├── Location BLoC                                         │
│  └── WiFi BLoC                                             │
├─────────────────────────────────────────────────────────────┤
│  Data Layer                                                 │
│  ├── Repositories (Abstract Interfaces)                    │
│  ├── Data Sources (Remote API, Local Storage)              │
│  └── Models (Domain Entities)                              │
├─────────────────────────────────────────────────────────────┤
│  Platform Services                                         │
│  ├── Location Services (GPS, Geofencing)                   │
│  ├── WiFi Services (Network Detection)                     │
│  ├── Secure Storage (Token Management)                     │
│  └── Biometric Authentication                              │
└─────────────────────────────────────────────────────────────┘
│
│ HTTPS/REST API
▼
┌─────────────────────────────────────────────────────────────┐
│                    Existing Backend                        │
│  ├── Authentication Service (JWT)                          │
│  ├── Attendance Service                                     │
│  ├── Location Validation Service                           │
│  └── PostgreSQL Database                                   │
└─────────────────────────────────────────────────────────────┘



### 1.2 Clean Architecture Principles
- **Dependency Inversion**: High-level modules don't depend on low-level modules
- **Single Responsibility**: Each layer has a single, well-defined purpose
- **Interface Segregation**: Small, focused interfaces rather than large ones
- **Dependency Injection**: Use GetIt for service location and dependency injection

## 2. Project Structure
lib/
├── core/
│   ├── constants/
│   │   ├── api_constants.dart
│   │   ├── app_constants.dart
│   │   └── storage_keys.dart
│   ├── errors/
│   │   ├── exceptions.dart
│   │   └── failures.dart
│   ├── network/
│   │   ├── api_client.dart
│   │   └── network_info.dart
│   ├── services/
│   │   ├── location_service.dart
│   │   ├── wifi_service.dart
│   │   └── secure_storage_service.dart
│   └── utils/
│       ├── date_utils.dart
│       └── validation_utils.dart
├── features/
│   ├── authentication/
│   │   ├── data/
│   │   │   ├── datasources/
│   │   │   ├── models/
│   │   │   └── repositories/
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   ├── repositories/
│   │   │   └── usecases/
│   │   └── presentation/
│   │       ├── bloc/
│   │       ├── pages/
│   │       └── widgets/
│   ├── clock_in/
│   │   ├── data/
│   │   ├── domain/
│   │   └── presentation/
│   └── location/
│       ├── data/
│       ├── domain/
│       └── presentation/
├── shared/
│   ├── widgets/
│   ├── themes/
│   └── extensions/
└── main.dart


## 3. State Management (BLoC Pattern)

### 3.1 Authentication BLoC
```dart
// Authentication Events
abstract class AuthEvent extends Equatable {
  const AuthEvent();
}

class LoginRequested extends AuthEvent {
  final String email;
  final String password;
  const LoginRequested({required this.email, required this.password});
}

class LogoutRequested extends AuthEvent {}

class TokenRefreshRequested extends AuthEvent {}

// Authentication States
abstract class AuthState extends Equatable {
  const AuthState();
}

class AuthInitial extends AuthState {}
class AuthLoading extends AuthState {}
class AuthAuthenticated extends AuthState {
  final User user;
  final String token;
  const AuthAuthenticated({required this.user, required this.token});
}
class AuthUnauthenticated extends AuthState {}
class AuthError extends AuthState {
  final String message;
  const AuthError({required this.message});
}
```

### 3.2 Clock-In BLoC
```dart
// Clock-In Events
abstract class ClockInEvent extends Equatable {
  const ClockInEvent();
}

class CheckClockInStatus extends ClockInEvent {}

class ClockInRequested extends ClockInEvent {
  final ClockInMethod method;
  final Location location;
  final String? wifiSSID;
  final String? notes;
}

class ClockOutRequested extends ClockInEvent {
  final String? notes;
}

// Clock-In States
abstract class ClockInState extends Equatable {
  const ClockInState();
}

class ClockInInitial extends ClockInState {}
class ClockInLoading extends ClockInState {}
class ClockInSuccess extends ClockInState {
  final ClockRecord record;
  const ClockInSuccess({required this.record});
}
class ClockInError extends ClockInState {
  final String message;
  const ClockInError({required this.message});
}
```

## 4. Data Layer Architecture

### 4.1 Repository Pattern
```dart
// Abstract Repository Interface
abstract class ClockInRepository {
  Future<Either<Failure, ClockInStatus>> getClockInStatus();
  Future<Either<Failure, ClockRecord>> clockIn(ClockInRequest request);
  Future<Either<Failure, ClockRecord>> clockOut(ClockOutRequest request);
  Future<Either<Failure, List<ClockRecord>>> getClockInHistory();
}

// Implementation
class ClockInRepositoryImpl implements ClockInRepository {
  final ClockInRemoteDataSource remoteDataSource;
  final ClockInLocalDataSource localDataSource;
  final NetworkInfo networkInfo;

  ClockInRepositoryImpl({
    required this.remoteDataSource,
    required this.localDataSource,
    required this.networkInfo,
  });

  @override
  Future<Either<Failure, ClockRecord>> clockIn(ClockInRequest request) async {
    if (await networkInfo.isConnected) {
      try {
        final result = await remoteDataSource.clockIn(request);
        await localDataSource.cacheClockRecord(result);
        return Right(result);
      } catch (e) {
        return Left(ServerFailure());
      }
    } else {
      await localDataSource.queueClockInRequest(request);
      return Left(NetworkFailure());
    }
  }
}
```

### 4.2 Data Sources
```dart
// Remote Data Source
abstract class ClockInRemoteDataSource {
  Future<ClockRecord> clockIn(ClockInRequest request);
  Future<ClockRecord> clockOut(ClockOutRequest request);
  Future<ClockInStatus> getClockInStatus();
}

class ClockInRemoteDataSourceImpl implements ClockInRemoteDataSource {
  final ApiClient apiClient;

  ClockInRemoteDataSourceImpl({required this.apiClient});

  @override
  Future<ClockRecord> clockIn(ClockInRequest request) async {
    final response = await apiClient.post(
      '/api/attendance/checkin',
      data: request.toJson(),
    );
    return ClockRecordModel.fromJson(response.data);
  }
}

// Local Data Source
abstract class ClockInLocalDataSource {
  Future<void> cacheClockRecord(ClockRecord record);
  Future<ClockRecord?> getLastClockRecord();
  Future<void> queueClockInRequest(ClockInRequest request);
  Future<List<ClockInRequest>> getPendingRequests();
}
```

## 5. Platform Services

### 5.1 Location Service
```dart
class LocationService {
  static const LocationSettings _locationSettings = LocationSettings(
    accuracy: LocationAccuracy.high,
    distanceFilter: 10,
  );

  Future<Position> getCurrentPosition() async {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      throw LocationServiceDisabledException();
    }

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        throw LocationPermissionDeniedException();
      }
    }

    return await Geolocator.getCurrentPosition(
      locationSettings: _locationSettings,
    );
  }

  Future<bool> isWithinOfficeRadius(Position position, OfficeLocation office) {
    double distance = Geolocator.distanceBetween(
      position.latitude,
      position.longitude,
      office.latitude,
      office.longitude,
    );
    return distance <= office.radiusMeters;
  }
}
```

### 5.2 WiFi Service
```dart
class WiFiService {
  Future<String?> getCurrentWiFiSSID() async {
    try {
      final wifiInfo = NetworkInfo();
      return await wifiInfo.getWifiName();
    } catch (e) {
      return null;
    }
  }

  Future<bool> isConnectedToOfficeWiFi(List<String> officeSSIDs) async {
    final currentSSID = await getCurrentWiFiSSID();
    if (currentSSID == null) return false;
    
    return officeSSIDs.contains(currentSSID.replaceAll('"', ''));
  }
}
```

### 5.3 Secure Storage Service
```dart
class SecureStorageService {
  static const FlutterSecureStorage _storage = FlutterSecureStorage(
    aOptions: AndroidOptions(
      encryptedSharedPreferences: true,
    ),
    iOptions: IOSOptions(
      accessibility: IOSAccessibility.first_unlock_this_device,
    ),
  );

  Future<void> storeToken(String token) async {
    await _storage.write(key: StorageKeys.authToken, value: token);
  }

  Future<String?> getToken() async {
    return await _storage.read(key: StorageKeys.authToken);
  }

  Future<void> deleteToken() async {
    await _storage.delete(key: StorageKeys.authToken);
  }
}
```

## 6. API Integration

### 6.1 API Client Configuration
```dart
class ApiClient {
  late final Dio _dio;
  final SecureStorageService _storageService;

  ApiClient(this._storageService) {
    _dio = Dio(BaseOptions(
      baseUrl: ApiConstants.baseUrl,
      connectTimeout: const Duration(seconds: 30),
      receiveTimeout: const Duration(seconds: 30),
      headers: {
        'Content-Type': 'application/json',
      },
    ));

    _dio.interceptors.add(AuthInterceptor(_storageService));
    _dio.interceptors.add(LogInterceptor(requestBody: true, responseBody: true));
  }

  Future<Response> post(String path, {dynamic data}) async {
    return await _dio.post(path, data: data);
  }

  Future<Response> get(String path, {Map<String, dynamic>? queryParameters}) async {
    return await _dio.get(path, queryParameters: queryParameters);
  }
}

class AuthInterceptor extends Interceptor {
  final SecureStorageService _storageService;

  AuthInterceptor(this._storageService);

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) async {
    final token = await _storageService.getToken();
    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    if (err.response?.statusCode == 401) {
      // Handle token expiry
      _storageService.deleteToken();
      // Navigate to login screen
    }
    handler.next(err);
  }
}
```

## 7. Error Handling

### 7.1 Failure Classes
```dart
abstract class Failure extends Equatable {
  final String message;
  const Failure(this.message);

  @override
  List<Object> get props => [message];
}

class ServerFailure extends Failure {
  const ServerFailure([String message = 'Server error occurred']) : super(message);
}

class NetworkFailure extends Failure {
  const NetworkFailure([String message = 'Network connection failed']) : super(message);
}

class LocationFailure extends Failure {
  const LocationFailure([String message = 'Location service error']) : super(message);
}

class AuthenticationFailure extends Failure {
  const AuthenticationFailure([String message = 'Authentication failed']) : super(message);
}
```

### 7.2 Exception Handling
```dart
class ExceptionHandler {
  static Failure handleException(Exception exception) {
    if (exception is DioException) {
      switch (exception.type) {
        case DioExceptionType.connectionTimeout:
        case DioExceptionType.receiveTimeout:
        case DioExceptionType.sendTimeout:
          return const NetworkFailure('Connection timeout');
        case DioExceptionType.badResponse:
          return ServerFailure('Server error: ${exception.response?.statusCode}');
        default:
          return const NetworkFailure('Network error occurred');
      }
    } else if (exception is LocationServiceDisabledException) {
      return const LocationFailure('Location services are disabled');
    } else if (exception is LocationPermissionDeniedException) {
      return const LocationFailure('Location permission denied');
    }
    return const ServerFailure('An unexpected error occurred');
  }
}
```

## 8. Testing Strategy

### 8.1 Unit Tests
- **BLoC Tests**: Test all events and state transitions
- **Repository Tests**: Mock data sources and test business logic
- **Use Case Tests**: Test individual business operations
- **Service Tests**: Test platform services with mocked dependencies

### 8.2 Integration Tests
- **API Integration**: Test actual API calls with test server
- **Database Integration**: Test local storage operations
- **Location Services**: Test GPS and WiFi functionality

### 8.3 Widget Tests
- **Screen Tests**: Test UI components and user interactions
- **Form Validation**: Test input validation and error states
- **Navigation**: Test routing and screen transitions

## 9. Performance Optimization

### 9.1 Memory Management
- **BLoC Disposal**: Properly dispose of BLoCs and streams
- **Image Optimization**: Use cached network images
- **List Optimization**: Implement lazy loading for large lists

### 9.2 Battery Optimization
- **Location Services**: Request location only when needed
- **Background Tasks**: Minimize background processing
- **Network Calls**: Implement request caching and debouncing

### 9.3 App Size Optimization
- **Code Splitting**: Use deferred loading for non-critical features
- **Asset Optimization**: Compress images and use vector graphics
- **Dependency Management**: Remove unused dependencies

## 10. Security Considerations

### 10.1 Data Protection
- **Token Security**: Store JWT tokens in secure storage
- **Location Privacy**: Encrypt location data in transit
- **Certificate Pinning**: Implement SSL certificate pinning

### 10.2 Authentication Security
- **Biometric Authentication**: Optional fingerprint/face ID
- **Session Management**: Automatic logout on token expiry
- **Secure Communication**: HTTPS only with TLS 1.3

### 10.3 Code Security
- **Obfuscation**: Enable code obfuscation for release builds
- **API Key Protection**: Store sensitive keys securely
- **Root/Jailbreak Detection**: Detect compromised devices

## 11. Deployment and CI/CD

### 11.1 Build Configuration
```yaml
# pubspec.yaml
name: flutter_clock_in_app
version: 1.0.0+1

environment:
  sdk: '>=3.0.0 <4.0.0'
  flutter: ">=3.10.0"

dependencies:
  flutter:
    sdk: flutter
  
  # State Management
  flutter_bloc: ^8.1.3
  equatable: ^2.0.5
  
  # Network
  dio: ^5.3.2
  connectivity_plus: ^4.0.2
  
  # Location
  geolocator: ^9.0.2
  
  # WiFi
  network_info_plus: ^4.0.2
  
  # Storage
  flutter_secure_storage: ^9.0.0
  hive: ^2.2.3
  hive_flutter: ^1.1.0
  
  # Authentication
  local_auth: ^2.1.6
  
  # Dependency Injection
  get_it: ^7.6.4
  
  # Utils
  dartz: ^0.10.1
  intl: ^0.18.1

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^2.0.3
  mockito: ^5.4.2
  bloc_test: ^9.1.4
  build_runner: ^2.4.6
  hive_generator: ^2.0.1
```

### 11.2 CI/CD Pipeline
```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: subosito/flutter-action@v2
        with:
          flutter-version: '3.10.0'
      - run: flutter pub get
      - run: flutter analyze
      - run: flutter test --coverage
      - uses: codecov/codecov-action@v3
        with:
          file: coverage/lcov.info

  build_android:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: subosito/flutter-action@v2
      - run: flutter pub get
      - run: flutter build apk --release
      - uses: actions/upload-artifact@v3
        with:
          name: android-apk
          path: build/app/outputs/flutter-apk/app-release.apk

  build_ios:
    needs: test
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3
      - uses: subosito/flutter-action@v2
      - run: flutter pub get
      - run: flutter build ios --release --no-codesign
```

## 12. Monitoring and Analytics

### 12.1 Crash Reporting
- **Firebase Crashlytics**: Real-time crash reporting
- **Error Tracking**: Custom error logging and reporting
- **Performance Monitoring**: App performance metrics

### 12.2 User Analytics
- **Usage Tracking**: Feature usage and user behavior
- **Performance Metrics**: App launch time, API response times
- **Business Metrics**: Clock-in success rates, location accuracy

### 12.3 Logging Strategy
```dart
class AppLogger {
  static void logInfo(String message, [Map<String, dynamic>? extra]) {
    developer.log(message, name: 'INFO', extra: extra);
  }

  static void logError(String message, [dynamic error, StackTrace? stackTrace]) {
    developer.log(
      message,
      name: 'ERROR',
      error: error,
      stackTrace: stackTrace,
    );
    // Send to crash reporting service
  }

  static void logClockInEvent(ClockInEvent event) {
    logInfo('Clock-in event', {
      'type': event.runtimeType.toString(),
      'timestamp': DateTime.now().toIso8601String(),
    });
  }
}
```