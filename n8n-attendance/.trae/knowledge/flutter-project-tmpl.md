# Flutter Project Template

```yaml
template:
  id: flutter-project-template-v1
  name: Flutter Clean Architecture Project
  version: 1.0
  output:
    format: project_structure
    filename: "{{project_name}}"
    title: "{{project_name}} - Flutter App with Clean Architecture"

workflow:
  mode: interactive
  elicitation: advanced-elicitation

agent_config:
  editable_sections:
    - Project Configuration
    - Dependencies
    - Architecture Setup
    - Testing Configuration

sections:
  - id: project_name
    title: Project Name
    type: text
    instruction: Enter the project name (use lowercase with underscores)
    validation: "^[a-z][a-z0-9_]*$"
    elicit: true
    
  - id: package_name
    title: Package Name
    type: text
    instruction: Enter the package name (reverse domain notation)
    template: "com.{{organization}}.{{project_name}}"
    elicit: true
    
  - id: description
    title: Project Description
    type: text
    instruction: Brief description of what the app does
    elicit: true
    
  - id: flutter_version
    title: Flutter Version
    type: choice
    choices: ["3.16.0", "3.19.0", "3.22.0", "Latest Stable"]
    default: "Latest Stable"
    instruction: Select Flutter SDK version to use
    
  - id: state_management
    title: State Management
    type: choice
    choices: ["bloc", "cubit", "riverpod"]
    default: "bloc"
    instruction: Choose state management solution
    
  - id: features
    title: Core Features
    type: multi-select
    choices: 
      - "Authentication"
      - "Navigation"
      - "HTTP Client"
      - "Local Storage"
      - "Push Notifications"
      - "Internationalization"
      - "Dark Mode"
    instruction: Select features to include in the project setup
    elicit: true
    
  - id: testing_setup
    title: Testing Configuration
    type: multi-select
    choices:
      - "Unit Tests"
      - "Widget Tests"  
      - "Integration Tests"
      - "Golden Tests"
      - "Code Coverage"
    default: ["Unit Tests", "Widget Tests", "Integration Tests"]
    instruction: Select testing types to configure
    
  - id: platforms
    title: Target Platforms
    type: multi-select
    choices: ["iOS", "Android", "Web", "Desktop"]
    default: ["iOS", "Android"]
    instruction: Select platforms to support
    elicit: true

project_structure:
  directories:
    - "lib/core/error"
    - "lib/core/network"
    - "lib/core/utils" 
    - "lib/core/constants"
    - "lib/features/authentication/data/datasources"
    - "lib/features/authentication/data/models"
    - "lib/features/authentication/data/repositories"
    - "lib/features/authentication/domain/entities"
    - "lib/features/authentication/domain/repositories"
    - "lib/features/authentication/domain/usecases"
    - "lib/features/authentication/presentation/bloc"
    - "lib/features/authentication/presentation/pages"
    - "lib/features/authentication/presentation/widgets"
    - "lib/shared/widgets"
    - "lib/shared/theme"
    - "lib/shared/extensions"
    - "test/features/authentication/data"
    - "test/features/authentication/domain"
    - "test/features/authentication/presentation"
    - "test/core"
    - "test/shared"

files:
  - path: "pubspec.yaml"
    content: |
      name: {{project_name}}
      description: {{description}}
      publish_to: 'none'
      version: 1.0.0+1
      
      environment:
        sdk: '>=3.0.0 <4.0.0'
        flutter: ">=3.16.0"
      
      dependencies:
        flutter:
          sdk: flutter
        # State Management
        flutter_bloc: ^8.1.3
        bloc: ^8.1.2
        equatable: ^2.0.5
        # Dependency Injection
        get_it: ^7.6.4
        injectable: ^2.3.2
        # HTTP & Networking
        dio: ^5.3.2
        connectivity_plus: ^5.0.1
        # Local Storage
        shared_preferences: ^2.2.2
        hive: ^2.2.3
        hive_flutter: ^1.1.0
        # Navigation
        go_router: ^12.1.1
        # UI & Theming
        material_color_utilities: ^0.5.0
        # Utilities
        intl: ^0.18.1
        logger: ^2.0.2+1
      
      dev_dependencies:
        flutter_test:
          sdk: flutter
        flutter_lints: ^3.0.0
        # Testing
        bloc_test: ^9.1.4
        mocktail: ^1.0.0
        # Code Generation
        build_runner: ^2.4.7
        injectable_generator: ^2.4.1
        hive_generator: ^2.0.1
        json_serializable: ^6.7.1
        json_annotation: ^4.8.1
      
      flutter:
        uses-material-design: true
        generate: true

  - path: "lib/main.dart"
    content: |
      import 'package:flutter/material.dart';
      import 'package:flutter_bloc/flutter_bloc.dart';
      import 'package:{{project_name}}/core/di/injection_container.dart' as di;
      import 'package:{{project_name}}/shared/theme/app_theme.dart';
      import 'package:{{project_name}}/core/navigation/app_router.dart';
      
      void main() async {
        WidgetsFlutterBinding.ensureInitialized();
        await di.init();
        runApp(const MyApp());
      }
      
      class MyApp extends StatelessWidget {
        const MyApp({super.key});
      
        @override
        Widget build(BuildContext context) {
          return MaterialApp.router(
            title: '{{project_name}}',
            theme: AppTheme.lightTheme,
            darkTheme: AppTheme.darkTheme,
            routerConfig: AppRouter.router,
          );
        }
      }

  - path: "lib/core/error/failures.dart"
    content: |
      import 'package:equatable/equatable.dart';
      
      abstract class Failure extends Equatable {
        const Failure([this.message = '']);
        
        final String message;
        
        @override
        List<Object> get props => [message];
      }
      
      class ServerFailure extends Failure {
        const ServerFailure([super.message]);
      }
      
      class CacheFailure extends Failure {
        const CacheFailure([super.message]);
      }
      
      class NetworkFailure extends Failure {
        const NetworkFailure([super.message]);
      }
      
      class ValidationFailure extends Failure {
        const ValidationFailure([super.message]);
      }

  - path: "lib/core/network/network_info.dart"
    content: |
      import 'package:connectivity_plus/connectivity_plus.dart';
      
      abstract class NetworkInfo {
        Future<bool> get isConnected;
      }
      
      class NetworkInfoImpl implements NetworkInfo {
        final Connectivity connectivity;
        
        NetworkInfoImpl(this.connectivity);
        
        @override
        Future<bool> get isConnected async {
          final result = await connectivity.checkConnectivity();
          return result != ConnectivityResult.none;
        }
      }

  - path: "lib/shared/theme/app_theme.dart"
    content: |
      import 'package:flutter/material.dart';
      
      class AppTheme {
        static final ColorScheme _lightColorScheme = ColorScheme.fromSeed(
          seedColor: const Color(0xFF2196F3),
          brightness: Brightness.light,
        );
        
        static final ColorScheme _darkColorScheme = ColorScheme.fromSeed(
          seedColor: const Color(0xFF2196F3),
          brightness: Brightness.dark,
        );
        
        static ThemeData get lightTheme => ThemeData(
          useMaterial3: true,
          colorScheme: _lightColorScheme,
          appBarTheme: AppBarTheme(
            centerTitle: true,
            backgroundColor: _lightColorScheme.surface,
            foregroundColor: _lightColorScheme.onSurface,
          ),
          elevatedButtonTheme: ElevatedButtonThemeData(
            style: ElevatedButton.styleFrom(
              minimumSize: const Size.fromHeight(48),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
          ),
        );
        
        static ThemeData get darkTheme => ThemeData(
          useMaterial3: true,
          colorScheme: _darkColorScheme,
          appBarTheme: AppBarTheme(
            centerTitle: true,
            backgroundColor: _darkColorScheme.surface,
            foregroundColor: _darkColorScheme.onSurface,
          ),
          elevatedButtonTheme: ElevatedButtonThemeData(
            style: ElevatedButton.styleFrom(
              minimumSize: const Size.fromHeight(48),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
          ),
        );
      }

  - path: "test/test_helpers.dart"
    content: |
      import 'package:flutter_test/flutter_test.dart';
      import 'package:mocktail/mocktail.dart';
      
      /// Test helpers and mocks for unit testing
      class TestHelpers {
        static void registerFallbackValues() {
          // Register fallback values for mocktail here
        }
      }
      
      /// Base mock class with common functionality
      class BaseMock extends Mock {}

  - path: "analysis_options.yaml"
    content: |
      include: package:flutter_lints/flutter.yaml
      
      analyzer:
        exclude:
          - "**/*.g.dart"
          - "**/*.freezed.dart"
          - build/**
        errors:
          invalid_annotation_target: ignore
      
      linter:
        rules:
          # Dart Style
          prefer_single_quotes: true
          avoid_print: true
          prefer_const_constructors: true
          prefer_const_literals_to_create_immutables: true
          
          # Flutter Specific
          use_key_in_widget_constructors: false
          avoid_unnecessary_containers: true
          
          # Performance
          avoid_function_literals_in_foreach_calls: true
          
          # Code Quality
          always_use_package_imports: true
          avoid_relative_lib_imports: true

instructions:
  setup_steps:
    - "Create project directory structure"
    - "Generate pubspec.yaml with required dependencies"  
    - "Set up main.dart with basic app structure"
    - "Create core architecture files (errors, network, etc.)"
    - "Set up shared theme and widgets"
    - "Configure analysis_options.yaml for code quality"
    - "Initialize test helpers and base classes"
    - "Run 'flutter pub get' to install dependencies"
    - "Generate initial code with build_runner if needed"
    
  next_steps:
    - "Implement dependency injection with GetIt and Injectable"
    - "Set up navigation with GoRouter"
    - "Create first feature following clean architecture pattern"
    - "Set up CI/CD pipeline"
    - "Add comprehensive testing suite"
```