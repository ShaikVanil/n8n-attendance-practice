import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../bloc/auth_bloc.dart';
import '../bloc/auth_state.dart';
import 'login_page.dart';
import '../../../../shared/themes/colors.dart';
import '../../../../core/services/performance_service.dart';
import '../../../../core/services/background_initialization_service.dart';

class SplashPage extends StatefulWidget {
  const SplashPage({super.key});

  @override
  State<SplashPage> createState() => _SplashPageState();
}

class _SplashPageState extends State<SplashPage>
    with TickerProviderStateMixin {
  late AnimationController _logoController;
  late AnimationController _progressController;
  late Animation<double> _logoAnimation;
  late Animation<double> _progressAnimation;
  
  String _loadingText = 'Initializing...';
  double _progress = 0.0;

  @override
  void initState() {
    super.initState();
    _initializeAnimations();
    _startAppInitialization();
  }

  void _initializeAnimations() {
    _logoController = AnimationController(
      duration: const Duration(milliseconds: 1000),
      vsync: this,
    );
    
    _progressController = AnimationController(
      duration: const Duration(milliseconds: 2000),
      vsync: this,
    );

    _logoAnimation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _logoController,
      curve: Curves.elasticOut,
    ));

    _progressAnimation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _progressController,
      curve: Curves.easeInOut,
    ));

    _logoController.forward();
  }

  Future<void> _startAppInitialization() async {
    final performanceService = PerformanceService();
    final backgroundService = BackgroundInitializationService();
    
    performanceService.startMeasurement('app_launch');
    
    // Start background initialization
    backgroundService.initializeInBackground();
    
    // Simulate initialization steps with progress updates
    await _updateProgress(0.2, 'Loading core services...');
    await Future.delayed(const Duration(milliseconds: 300));
    
    await _updateProgress(0.4, 'Checking authentication...');
    await Future.delayed(const Duration(milliseconds: 200));
    
    await _updateProgress(0.6, 'Loading user preferences...');
    await Future.delayed(const Duration(milliseconds: 200));
    
    await _updateProgress(0.8, 'Preparing interface...');
    await Future.delayed(const Duration(milliseconds: 300));
    
    await _updateProgress(1.0, 'Ready!');
    await Future.delayed(const Duration(milliseconds: 200));
    
    performanceService.endMeasurement('app_launch');
    
    // Check if app launch is under 3 seconds
    if (performanceService.isAppLaunchUnder3Seconds()) {
      debugPrint('✅ App launch time requirement met!');
    } else {
      debugPrint('⚠️ App launch time exceeded 3 seconds');
    }
  }

  Future<void> _updateProgress(double progress, String text) async {
    setState(() {
      _progress = progress;
      _loadingText = text;
    });
    
    _progressController.animateTo(progress);
    await Future.delayed(const Duration(milliseconds: 100));
  }

  @override
  void dispose() {
    _logoController.dispose();
    _progressController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<AuthBloc, AuthState>(
      listener: (context, state) {
        if (state is AuthAuthenticated) {
          Navigator.of(context).pushReplacementNamed('/home');
        } else if (state is AuthUnauthenticated) {
          Navigator.of(context).pushReplacement(
            MaterialPageRoute(builder: (_) => const LoginPage()),
          );
        }
      },
      child: Scaffold(
        backgroundColor: AppColors.primary,
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // Animated logo
              AnimatedBuilder(
                animation: _logoAnimation,
                builder: (context, child) {
                  return Transform.scale(
                    scale: _logoAnimation.value,
                    child: Container(
                      width: 120,
                      height: 120,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(60),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.2),
                            blurRadius: 10,
                            offset: const Offset(0, 5),
                          ),
                        ],
                      ),
                      child: Icon(
                        Icons.security,
                        size: 60,
                        color: AppColors.primary,
                      ),
                    ),
                  );
                },
              ),
              const SizedBox(height: 24),
              
              // App title
              Text(
                'Global Protect',
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 48),
              
              // Progress indicator
              SizedBox(
                width: 200,
                child: Column(
                  children: [
                    AnimatedBuilder(
                      animation: _progressAnimation,
                      builder: (context, child) {
                        return LinearProgressIndicator(
                          value: _progressAnimation.value,
                          backgroundColor: Colors.white.withOpacity(0.3),
                          valueColor: const AlwaysStoppedAnimation<Color>(Colors.white),
                        );
                      },
                    ),
                    const SizedBox(height: 16),
                    Text(
                      _loadingText,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: Colors.white.withOpacity(0.8),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}