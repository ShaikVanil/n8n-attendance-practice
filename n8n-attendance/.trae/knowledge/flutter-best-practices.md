# Flutter Development Best Practices Guide

This document serves as a comprehensive guide for Flutter development best practices, following industry standards and the BLoC architectural pattern.

## Project Structure Best Practices

### Feature-First Organization

```
lib/
├── core/                    # Shared utilities and base classes
│   ├── constants/          # App-wide constants
│   ├── error/             # Error handling and exceptions
│   ├── network/           # Network utilities and interceptors
│   ├── theme/             # App theming and styling
│   ├── utils/             # Utility functions and helpers
│   └── di/                # Dependency injection setup
├── features/              # Feature-based modules
│   ├── authentication/
│   │   ├── data/
│   │   │   ├── datasources/   # Remote and local data sources
│   │   │   ├── models/        # Data models with JSON serialization
│   │   │   └── repositories/  # Repository implementations
│   │   ├── domain/
│   │   │   ├── entities/      # Business objects
│   │   │   ├── repositories/  # Abstract repository interfaces  
│   │   │   └── usecases/      # Business logic use cases
│   │   └── presentation/
│   │       ├── bloc/          # BLoC components (events, states, bloc)
│   │       ├── pages/         # Screen implementations
│   │       └── widgets/       # Feature-specific widgets
│   └── home/
│       ├── data/
│       ├── domain/
│       └── presentation/
└── shared/                # Truly shared components
    ├── widgets/           # Reusable widgets across features
    ├── extensions/        # Dart extensions
    └── constants/         # Shared constants
```

## Code Organization Standards

### Naming Conventions

#### Files and Directories
- **Files**: `snake_case.dart`
- **Directories**: `snake_case`
- **Assets**: `snake_case.png`, `snake_case.svg`

#### Classes and Types
- **Classes**: `PascalCase`
- **Abstract classes**: `PascalCase` (often with "Abstract" prefix or "Base")
- **Enums**: `PascalCase`
- **Typedefs**: `PascalCase`

#### Variables and Functions
- **Variables**: `camelCase`
- **Functions**: `camelCase`  
- **Constants**: `camelCase` (class-level) or `UPPER_SNAKE_CASE` (top-level)
- **Private members**: `_camelCase`

#### BLoC Naming
- **BLoC class**: `FeatureBloc`
- **Event classes**: `FeatureEvent`, `SpecificEventName`
- **State classes**: `FeatureState`, `FeatureLoading`, `FeatureLoaded`
- **Files**: `feature_bloc.dart`, `feature_event.dart`, `feature_state.dart`

### Import Organization

```dart
// Dart core libraries
import 'dart:async';
import 'dart:convert';

// Flutter framework
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

// Third-party packages (alphabetical)
import 'package:dio/dio.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:get_it/get_it.dart';

// Internal imports (alphabetical)
import '../../../core/error/failures.dart';
import '../data/models/user_model.dart';
import '../domain/entities/user.dart';
```

## BLoC Pattern Implementation

### Event Design Principles

```dart
// Good: Descriptive and specific
abstract class AuthenticationEvent extends Equatable {
  const AuthenticationEvent();
}

class LoginRequested extends AuthenticationEvent {
  final String email;
  final String password;
  
  const LoginRequested({
    required this.email,
    required this.password,
  });
  
  @override
  List<Object> get props => [email, password];
}

class LogoutRequested extends AuthenticationEvent {
  @override
  List<Object> get props => [];
}

// Bad: Generic and unclear
class AuthenticationEvent {
  final String type;
  final Map<String, dynamic> data;
}
```

### State Design Principles

```dart
// Good: Clear state hierarchy with specific data
abstract class AuthenticationState extends Equatable {
  const AuthenticationState();
}

class AuthenticationInitial extends AuthenticationState {
  @override
  List<Object> get props => [];
}

class AuthenticationLoading extends AuthenticationState {
  @override
  List<Object> get props => [];
}

class AuthenticationAuthenticated extends AuthenticationState {
  final User user;
  
  const AuthenticationAuthenticated({required this.user});
  
  @override
  List<Object> get props => [user];
}

class AuthenticationUnauthenticated extends AuthenticationState {
  @override
  List<Object> get props => [];
}

class AuthenticationFailure extends AuthenticationState {
  final String message;
  
  const AuthenticationFailure({required this.message});
  
  @override
  List<Object> get props => [message];
}
```

### BLoC Implementation Best Practices

```dart
class AuthenticationBloc extends Bloc<AuthenticationEvent, AuthenticationState> {
  final LoginUseCase _loginUseCase;
  final LogoutUseCase _logoutUseCase;
  final GetCurrentUserUseCase _getCurrentUserUseCase;
  
  AuthenticationBloc({
    required LoginUseCase loginUseCase,
    required LogoutUseCase logoutUseCase,
    required GetCurrentUserUseCase getCurrentUserUseCase,
  })  : _loginUseCase = loginUseCase,
        _logoutUseCase = logoutUseCase,
        _getCurrentUserUseCase = getCurrentUserUseCase,
        super(AuthenticationInitial()) {
    on<LoginRequested>(_onLoginRequested);
    on<LogoutRequested>(_onLogoutRequested);
    on<AuthenticationStarted>(_onAuthenticationStarted);
  }

  Future<void> _onLoginRequested(
    LoginRequested event,
    Emitter<AuthenticationState> emit,
  ) async {
    emit(AuthenticationLoading());
    
    final result = await _loginUseCase(LoginParams(
      email: event.email,
      password: event.password,
    ));
    
    result.fold(
      (failure) => emit(AuthenticationFailure(message: failure.message)),
      (user) => emit(AuthenticationAuthenticated(user: user)),
    );
  }
  
  // Other event handlers...
}
```

## Widget Best Practices

### Performance Optimization

#### Use const Constructors
```dart
// Good
class MyWidget extends StatelessWidget {
  const MyWidget({super.key});
  
  @override
  Widget build(BuildContext context) {
    return const Text('Hello World');
  }
}

// Bad - unnecessary rebuilds
class MyWidget extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Text('Hello World');
  }
}
```

#### Efficient List Building
```dart
// Good: For dynamic lists
ListView.builder(
  itemCount: items.length,
  itemBuilder: (context, index) {
    return ListTile(title: Text(items[index].name));
  },
)

// Good: For static/small lists
const ListView(
  children: [
    ListTile(title: Text('Item 1')),
    ListTile(title: Text('Item 2')),
  ],
)
```

#### Widget Separation
```dart
// Good: Separated widgets
class UserProfile extends StatelessWidget {
  final User user;
  
  const UserProfile({super.key, required this.user});
  
  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        UserAvatar(user: user),
        UserDetails(user: user),
        UserActions(user: user),
      ],
    );
  }
}

// Bad: Everything in one build method
class UserProfile extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // 100+ lines of widget code
      ],
    );
  }
}
```

### BLoC Integration in Widgets

```dart
class LoginPage extends StatelessWidget {
  const LoginPage({super.key});
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Login')),
      body: BlocConsumer<AuthenticationBloc, AuthenticationState>(
        listener: (context, state) {
          // Handle side effects
          if (state is AuthenticationAuthenticated) {
            Navigator.of(context).pushReplacementNamed('/home');
          } else if (state is AuthenticationFailure) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(state.message)),
            );
          }
        },
        builder: (context, state) {
          // Handle UI changes
          return switch (state) {
            AuthenticationLoading() => const Center(
              child: CircularProgressIndicator(),
            ),
            _ => LoginForm(),
          };
        },
      ),
    );
  }
}
```

## Testing Best Practices

### Testing Pyramid Structure

1. **Unit Tests (70%)**: Business logic, use cases, repositories
2. **Widget Tests (20%)**: UI components and interactions
3. **Integration Tests (10%)**: End-to-end workflows

### BLoC Testing

```dart
group('AuthenticationBloc', () {
  late AuthenticationBloc authBloc;
  late MockLoginUseCase mockLoginUseCase;
  
  setUp(() {
    mockLoginUseCase = MockLoginUseCase();
    authBloc = AuthenticationBloc(loginUseCase: mockLoginUseCase);
  });
  
  tearDown(() {
    authBloc.close();
  });
  
  test('initial state is AuthenticationInitial', () {
    expect(authBloc.state, const AuthenticationInitial());
  });
  
  blocTest<AuthenticationBloc, AuthenticationState>(
    'emits [AuthenticationLoading, AuthenticationAuthenticated] when login succeeds',
    build: () {
      when(() => mockLoginUseCase(any()))
          .thenAnswer((_) async => const Right(mockUser));
      return authBloc;
    },
    act: (bloc) => bloc.add(const LoginRequested(
      email: 'test@example.com',
      password: 'password123',
    )),
    expect: () => [
      const AuthenticationLoading(),
      const AuthenticationAuthenticated(user: mockUser),
    ],
    verify: (_) {
      verify(() => mockLoginUseCase(const LoginParams(
        email: 'test@example.com',
        password: 'password123',
      ))).called(1);
    },
  );
});
```

### Widget Testing

```dart
testWidgets('LoginForm should emit LoginRequested when submitted', (tester) async {
  final mockBloc = MockAuthenticationBloc();
  
  when(() => mockBloc.state).thenReturn(const AuthenticationInitial());
  
  await tester.pumpWidget(
    MaterialApp(
      home: BlocProvider<AuthenticationBloc>.value(
        value: mockBloc,
        child: const LoginForm(),
      ),
    ),
  );
  
  // Enter credentials
  await tester.enterText(find.byType(TextField).first, 'test@example.com');
  await tester.enterText(find.byType(TextField).last, 'password123');
  
  // Submit form
  await tester.tap(find.byType(ElevatedButton));
  await tester.pump();
  
  // Verify event was emitted
  verify(() => mockBloc.add(const LoginRequested(
    email: 'test@example.com',
    password: 'password123',
  ))).called(1);
});
```

## Error Handling Best Practices

### Failure Types
```dart
abstract class Failure extends Equatable {
  const Failure([this.message = '']);
  
  final String message;
  
  @override
  List<Object> get props => [message];
}

class ServerFailure extends Failure {
  const ServerFailure([super.message]);
}

class NetworkFailure extends Failure {  
  const NetworkFailure([super.message]);
}

class CacheFailure extends Failure {
  const CacheFailure([super.message]);
}

class ValidationFailure extends Failure {
  const ValidationFailure([super.message]);
}
```

### Exception to Failure Mapping
```dart
class RepositoryImpl implements Repository {
  @override
  Future<Either<Failure, Model>> getData() async {
    try {
      final result = await remoteDataSource.getData();
      return Right(result.toEntity());
    } on ServerException catch (e) {
      return Left(ServerFailure(e.message));
    } on SocketException {
      return Left(const NetworkFailure('No internet connection'));
    } catch (e) {
      return Left(ServerFailure(e.toString()));
    }
  }
}
```

## Performance Guidelines

### Memory Management
- Dispose controllers, streams, and subscriptions
- Use weak references for callbacks
- Avoid memory leaks in StatefulWidgets

```dart
class MyWidget extends StatefulWidget {
  @override
  _MyWidgetState createState() => _MyWidgetState();
}

class _MyWidgetState extends State<MyWidget> {
  late TextEditingController _controller;
  late StreamSubscription _subscription;
  
  @override
  void initState() {
    super.initState();
    _controller = TextEditingController();
    _subscription = someStream.listen((_) {});
  }
  
  @override
  void dispose() {
    _controller.dispose();
    _subscription.cancel();
    super.dispose();
  }
  
  @override
  Widget build(BuildContext context) {
    return TextField(controller: _controller);
  }
}
```

### Build Optimization
- Use `RepaintBoundary` for complex widgets
- Implement `shouldRebuild` in custom widgets
- Minimize widget depth

## Accessibility Guidelines

### Semantic Labels
```dart
// Good
IconButton(
  icon: const Icon(Icons.favorite),
  onPressed: () {},
  tooltip: 'Add to favorites',
)

FloatingActionButton(
  onPressed: () {},
  child: const Icon(Icons.add),
  tooltip: 'Add new item',
)

// For complex widgets
Semantics(
  label: 'User profile picture',
  child: CircleAvatar(backgroundImage: NetworkImage(user.avatarUrl)),
)
```

### Focus Management
```dart
class LoginForm extends StatefulWidget {
  @override
  _LoginFormState createState() => _LoginFormState();
}

class _LoginFormState extends State<LoginForm> {
  final _emailFocusNode = FocusNode();
  final _passwordFocusNode = FocusNode();
  
  @override
  void dispose() {
    _emailFocusNode.dispose();
    _passwordFocusNode.dispose();
    super.dispose();
  }
  
  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        TextField(
          focusNode: _emailFocusNode,
          textInputAction: TextInputAction.next,
          onSubmitted: (_) => _passwordFocusNode.requestFocus(),
        ),
        TextField(
          focusNode: _passwordFocusNode,
          textInputAction: TextInputAction.done,
        ),
      ],
    );
  }
}
```

## Dependency Injection Best Practices

### GetIt + Injectable Setup
```dart
// injection_container.dart
final getIt = GetIt.instance;

@InjectableInit()
Future<void> configureDependencies() async => getIt.init();

@module
abstract class AppModule {
  @preResolve
  Future<SharedPreferences> get prefs => SharedPreferences.getInstance();
  
  @lazySingleton
  Dio get dio => Dio()
    ..interceptors.add(LogInterceptor())
    ..options = BaseOptions(baseUrl: 'https://api.example.com');
    
  @lazySingleton
  NetworkInfo get networkInfo => NetworkInfoImpl(Connectivity());
}
```

### Usage in BLoCs
```dart
@injectable
class AuthenticationBloc extends Bloc<AuthenticationEvent, AuthenticationState> {
  final LoginUseCase _loginUseCase;
  
  AuthenticationBloc({
    required LoginUseCase loginUseCase,
  }) : _loginUseCase = loginUseCase,
       super(AuthenticationInitial());
}
```

## Internationalization Guidelines

### Setup
```yaml
# pubspec.yaml
dependencies:
  flutter_localizations:
    sdk: flutter
  intl: any

flutter:
  generate: true
```

```yaml
# l10n.yaml
arb-dir: lib/l10n
template-arb-file: app_en.arb
output-localization-file: app_localizations.dart
```

### Usage
```dart
// In widgets
Text(AppLocalizations.of(context)!.loginButton)

// With parameters
Text(AppLocalizations.of(context)!.welcomeMessage(user.name))
```

## Security Best Practices

### API Keys and Secrets
- Never commit API keys to version control
- Use environment variables or build configurations
- Implement certificate pinning for production

### Data Storage
```dart
// Secure storage for sensitive data
final storage = FlutterSecureStorage();
await storage.write(key: 'auth_token', value: token);

// Regular storage for non-sensitive data
final prefs = await SharedPreferences.getInstance();
await prefs.setString('user_preference', value);
```

## CI/CD Best Practices

### Code Quality Gates
- Static analysis with `flutter analyze`
- Code formatting with `flutter format`
- Test coverage requirements (minimum 80%)
- Automated testing on PRs

### Build Configuration
```yaml
# .github/workflows/flutter.yml
name: Flutter CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: subosito/flutter-action@v2
      - run: flutter pub get
      - run: flutter analyze
      - run: flutter test --coverage
      - uses: codecov/codecov-action@v3
  
  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: subosito/flutter-action@v2
      - run: flutter build apk --release
```

This guide ensures consistent, maintainable, and high-quality Flutter applications following industry best practices and the BLoC architectural pattern.