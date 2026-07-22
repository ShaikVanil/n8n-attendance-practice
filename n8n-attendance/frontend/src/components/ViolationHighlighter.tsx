import React from 'react';
import { ComplianceViolation } from '../services/auditService';
import { Badge } from './ui/Badge';
import { Alert, AlertDescription } from './ui/Alert';
import { AlertTriangle, Shield, Eye, Clock } from 'lucide-react';

interface ViolationHighlighterProps {
  violations: ComplianceViolation[];
  className?: string;
  showDetails?: boolean;
  onViolationClick?: (violation: ComplianceViolation) => void;
}

export const ViolationHighlighter: React.FC<ViolationHighlighterProps> = ({
  violations,
  className = '',
  showDetails = true,
  onViolationClick
}) => {
  const getSeverityConfig = (severity: string) => {
    switch (severity) {
      case 'critical':
        return {
          color: 'bg-red-100 border-red-500 text-red-800',
          icon: AlertTriangle,
          iconColor: 'text-red-600',
          pulse: 'animate-pulse'
        };
      case 'high':
        return {
          color: 'bg-orange-100 border-orange-500 text-orange-800',
          icon: Shield,
          iconColor: 'text-orange-600',
          pulse: ''
        };
      case 'medium':
        return {
          color: 'bg-yellow-100 border-yellow-500 text-yellow-800',
          icon: Eye,
          iconColor: 'text-yellow-600',
          pulse: ''
        };
      default:
        return {
          color: 'bg-blue-100 border-blue-500 text-blue-800',
          icon: Clock,
          iconColor: 'text-blue-600',
          pulse: ''
        };
    }
  };

  const getViolationTypeColor = (violationType: string) => {
    const typeColors: Record<string, string> = {
      'security_breach': 'bg-red-500',
      'data_access_violation': 'bg-purple-500',
      'privilege_violation': 'bg-orange-500',
      'policy_violation': 'bg-yellow-500',
      'attendance_violation': 'bg-blue-500',
      'default': 'bg-gray-500'
    };
    
    return typeColors[violationType] || typeColors.default;
  };

  if (violations.length === 0) {
    return (
      <div className={`text-center py-4 text-gray-500 ${className}`}>
        <Shield className="h-8 w-8 mx-auto mb-2 text-green-500" />
        <p>No compliance violations detected</p>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {violations.map((violation) => {
        const config = getSeverityConfig(violation.severity);
        const Icon = config.icon;
        
        return (
          <Alert
            key={violation.id}
            className={`${config.color} border-l-4 ${config.pulse} cursor-pointer transition-all hover:shadow-md`}
            onClick={() => onViolationClick?.(violation)}
          >
            <div className="flex items-start space-x-3">
              <Icon className={`h-5 w-5 ${config.iconColor} mt-0.5`} />
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Badge className={`${getSeverityConfig(violation.severity).color} text-xs`}>
                      {violation.severity.toUpperCase()}
                    </Badge>
                    <div className={`w-2 h-2 rounded-full ${getViolationTypeColor(violation.violation_type)}`} />
                    <span className="font-semibold text-sm">{violation.violation_type}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {violation.status}
                  </Badge>
                </div>
                
                <AlertDescription className="text-sm mb-2">
                  {violation.description}
                </AlertDescription>
                
                {showDetails && (
                  <div className="text-xs space-y-1 text-gray-600">
                    <div className="flex items-center justify-between">
                      <span>Detection: {violation.detection_method}</span>
                      <span>Detected: {new Date(violation.detected_at).toLocaleString()}</span>
                    </div>
                    
                    {violation.impact_assessment && (
                      <div className="bg-white bg-opacity-50 p-2 rounded text-xs">
                        <strong>Impact:</strong> {violation.impact_assessment}
                      </div>
                    )}
                    
                    {violation.user_id && (
                      <div>
                        <strong>User:</strong> {violation.username || violation.user_id}
                      </div>
                    )}
                    
                    {violation.entity_type && violation.entity_id && (
                      <div>
                        <strong>Entity:</strong> {violation.entity_type} ({violation.entity_id})
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </Alert>
        );
      })}
    </div>
  );
};

export default ViolationHighlighter;