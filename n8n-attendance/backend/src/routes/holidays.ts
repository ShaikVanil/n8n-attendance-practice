import { Router, Request, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { holidayService, CreateHolidayRequest, UpdateHolidayRequest, HolidayFilters } from '../services/holidayService';
import { User } from '../types/device';

const router = Router();

// Get holidays with optional filters
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user as User;
    const filters: HolidayFilters = {
      year: req.query.year ? parseInt(req.query.year as string) : undefined,
      month: req.query.month ? parseInt(req.query.month as string) : undefined,
      type: req.query.type as string,
      office_location: req.query.office_location as string || user.office_location,
      is_active: req.query.is_active ? req.query.is_active === 'true' : true
    };

    const holidays = await holidayService.getHolidays(filters);
    res.json({ holidays });
  } catch (error) {
    console.error('Error fetching holidays:', error);
    res.status(500).json({ error: 'Failed to fetch holidays' });
  }
});

// Get holidays in date range
router.get('/range', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user as User;
    const { start_date, end_date, office_location } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({ error: 'start_date and end_date are required' });
    }

    const holidays = await holidayService.getHolidaysInRange(
      start_date as string,
      end_date as string,
      (office_location as string) || user.office_location
    );

    res.json({ holidays });
  } catch (error) {
    console.error('Error fetching holidays in range:', error);
    res.status(500).json({ error: 'Failed to fetch holidays in range' });
  }
});

// Get upcoming holidays
router.get('/upcoming', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user as User;
    const days = req.query.days ? parseInt(req.query.days as string) : 30;
    const officeLocation = (req.query.office_location as string) || user.office_location;

    const holidays = await holidayService.getUpcomingHolidays(days, officeLocation);
    res.json({ holidays });
  } catch (error) {
    console.error('Error fetching upcoming holidays:', error);
    res.status(500).json({ error: 'Failed to fetch upcoming holidays' });
  }
});

// Check if a specific date is a holiday
router.get('/check/:date', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user as User;
    const { date } = req.params;
    const officeLocation = (req.query.office_location as string) || user.office_location;

    const result = await holidayService.isHoliday(date, officeLocation);
    res.json(result);
  } catch (error) {
    console.error('Error checking holiday:', error);
    res.status(500).json({ error: 'Failed to check holiday' });
  }
});

// Get holiday statistics
router.get('/statistics', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user as User;
    const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();
    const officeLocation = (req.query.office_location as string) || user.office_location;

    const statistics = await holidayService.getHolidayStatistics(year, officeLocation);
    res.json({ statistics });
  } catch (error) {
    console.error('Error fetching holiday statistics:', error);
    res.status(500).json({ error: 'Failed to fetch holiday statistics' });
  }
});

// Admin-only routes
// Create a new holiday
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user as User;
    
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const holidayData: CreateHolidayRequest = req.body;
    const holiday = await holidayService.createHoliday(holidayData, user.id);
    
    res.status(201).json({ holiday });
  } catch (error) {
    console.error('Error creating holiday:', error);
    res.status(500).json({ error: 'Failed to create holiday' });
  }
});

// Update a holiday
router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {  
  try {
    const user = req.user as User;
    
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    const updateData: UpdateHolidayRequest = req.body;
    
    const holiday = await holidayService.updateHoliday(id, updateData);
    res.json({ holiday });
  } catch (error) {
    console.error('Error updating holiday:', error);
    if (error instanceof Error && error.message === 'Holiday not found') {
      res.status(404).json({ error: 'Holiday not found' });
    } else {
      res.status(500).json({ error: 'Failed to update holiday' });
    }
  }
});

// Delete a holiday
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user as User;
    
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    await holidayService.deleteHoliday(id);
    
    res.json({ message: 'Holiday deleted successfully' });
  } catch (error) {
    console.error('Error deleting holiday:', error);
    if (error instanceof Error && error.message === 'Holiday not found') {
      res.status(404).json({ error: 'Holiday not found' });
    } else {
      res.status(500).json({ error: 'Failed to delete holiday' });
    }
  }
});

// Generate recurring holidays for next year
router.post('/generate-recurring/:year', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user as User;
    
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const year = parseInt(req.params.year);
    const newHolidays = await holidayService.generateRecurringHolidays(year);
    
    res.json({ 
      message: `Generated ${newHolidays.length} recurring holidays for ${year}`,
      holidays: newHolidays 
    });
  } catch (error) {
    console.error('Error generating recurring holidays:', error);
    res.status(500).json({ error: 'Failed to generate recurring holidays' });
  }
});

// Holiday observance routes
// Set holiday observance for user
router.post('/:id/observance', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user as User;
    const { id: holidayId } = req.params;
    const { is_observed, notes } = req.body;

    const observance = await holidayService.setHolidayObservance(
      holidayId,
      user.id,
      is_observed,
      notes
    );
    
    res.json({ observance });
  } catch (error) {
    console.error('Error setting holiday observance:', error);
    res.status(500).json({ error: 'Failed to set holiday observance' });
  }
});

// Get user's holiday observances
router.get('/observances/my', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user as User;
    const year = req.query.year ? parseInt(req.query.year as string) : undefined;

    const observances = await holidayService.getUserHolidayObservances(user.id, year);
    res.json({ observances });
  } catch (error) {
    console.error('Error fetching user holiday observances:', error);
    res.status(500).json({ error: 'Failed to fetch holiday observances' });
  }
});

export default router;