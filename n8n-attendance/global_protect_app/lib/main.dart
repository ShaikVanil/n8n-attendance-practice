import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:global_protect_app/features/authentication/presentation/pages/login_page.dart';
import 'package:provider/provider.dart';
import 'package:global_protect_app/core/services/performance_service.dart';
import 'package:global_protect_app/core/services/sync_service.dart';
import 'package:global_protect_app/core/services/notification_service.dart'; // Add this import
import 'package:global_protect_app/core/theme/bloc/theme_bloc.dart';
import 'package:global_protect_app/features/authentication/presentation/bloc/auth_bloc.dart';
import 'package:global_protect_app/features/authentication/presentation/bloc/auth_event.dart';
import 'package:global_protect_app/features/clock_in/presentation/bloc/attendance/attendance_bloc.dart';
import 'package:global_protect_app/features/clock_in/presentation/bloc/wifi/wifi_bloc.dart';
import 'package:global_protect_app/features/location/presentation/bloc/location_bloc.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'core/injection/injection_container.dart' as di;
import 'features/authentication/presentation/pages/splash_page.dart';
import 'features/home/presentation/pages/home_page.dart';

void main() async {
  // Start performance monitoring
  final performanceService = PerformanceService();
  performanceService.startMeasurement('app_startup');

  WidgetsFlutterBinding.ensureInitialized();

  await Hive.initFlutter();
  await di.init();
  
  // Initialize notification service
  final notificationService = di.sl<NotificationService>();
  await notificationService.initialize();
  
  performanceService.endMeasurement('app_startup');

  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        // Add SyncService provider
        Provider<SyncService>(
          create: (_) => di.sl<SyncService>(),
          dispose: (_, syncService) => syncService.dispose(), // If SyncService has a dispose method
        ),
        // Existing BlocProviders
        BlocProvider<ThemeBloc>(
          create: (_) => di.sl<ThemeBloc>()..add(LoadThemeEvent()),
        ),
        BlocProvider<AuthBloc>(
          create: (_) => di.sl<AuthBloc>()..add(CheckAuthStatusEvent()),
        ),
        BlocProvider<AttendanceBloc>(
          create: (_) => di.sl<AttendanceBloc>(),
        ),
        BlocProvider<WiFiBloc>(
          create: (_) => di.sl<WiFiBloc>(),
        ),
        BlocProvider<LocationBloc>(
          create: (_) => di.sl<LocationBloc>(),
        ),
      ],
      child: BlocBuilder<ThemeBloc, ThemeState>(
        builder: (context, themeState) {
          return MaterialApp(
            title: 'Global Protect',
            theme: ThemeData(
              primarySwatch: Colors.blue,
              visualDensity: VisualDensity.adaptivePlatformDensity,
            ),
            home: const SplashPage(),
            routes: {
              '/home': (context) => const HomePage(),
              '/login': (context) => const LoginPage(), // Add this line
              // '/timesheet': (context) => const TimesheetPage(),
              // '/leave-request': (context) => const LeaveRequestPage(),
              // '/attendance-history': (context) => const AttendanceHistoryPage(),
              // '/reports': (context) => const ReportsPage(),
            },
            onGenerateRoute: (settings) {
              // Handle dynamic routes if needed
              switch (settings.name) {
                default:
                  return MaterialPageRoute(
                    builder: (context) => const HomePage(),
                  );
              }
            },
          );
        }));
  }
}
