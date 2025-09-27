import React, { createContext, useContext, useReducer, useEffect } from 'react';

// Types
export interface UserPreferences {
  defaultMapView: {
    center: [number, number];
    zoom: number;
  };
  selectedLayers: {
    parcels: boolean;
    lirr_stations: boolean;
    lirr_lines: boolean;
    flood_zones: boolean;
  };
  sidebarCollapsed: boolean;
  notifications: boolean;
}

export interface GISDataState {
  parcels: any;
  stations: any;
  flood_zones: any;
  custom_layers: any[];
  loading: {
    parcels: boolean;
    stations: boolean;
    flood_zones: boolean;
    custom: boolean;
  };
  error: {
    parcels: string | null;
    stations: string | null;
    flood_zones: string | null;
    custom: string | null;
  };
  lastUpdated: {
    parcels: Date | null;
    stations: Date | null;
    flood_zones: Date | null;
  };
}

export interface AnalysisState {
  results: {
    housing: any;
    flood: any;
    tree_canopy: any;
    custom: any[];
  };
  loading: {
    housing: boolean;
    flood: boolean;
    tree_canopy: boolean;
    custom: boolean;
  };
  progress: {
    current: number;
    total: number;
    status: string;
  } | null;
}

export interface AppState {
  user: {
    preferences: UserPreferences;
  };
  gisData: GISDataState;
  analysis: AnalysisState;
  ui: {
    selectedTool: string;
    notifications: Array<{
      id: string;
      type: 'success' | 'error' | 'warning' | 'info';
      message: string;
      timestamp: Date;
      read: boolean;
    }>;
  };
}

// Action types
export type AppAction =
  | { type: 'SET_USER_PREFERENCES'; payload: Partial<UserPreferences> }
  | { type: 'SET_SELECTED_LAYERS'; payload: Partial<UserPreferences['selectedLayers']> }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'SET_SELECTED_TOOL'; payload: string }
  | { type: 'SET_GIS_DATA'; payload: { dataType: keyof GISDataState; data: any } }
  | { type: 'SET_GIS_LOADING'; payload: { dataType: keyof GISDataState['loading']; loading: boolean } }
  | { type: 'SET_GIS_ERROR'; payload: { dataType: keyof GISDataState['error']; error: string | null } }
  | { type: 'SET_ANALYSIS_RESULTS'; payload: { analysisType: keyof AnalysisState['results']; results: any } }
  | { type: 'SET_ANALYSIS_LOADING'; payload: { analysisType: keyof AnalysisState['loading']; loading: boolean } }
  | { type: 'SET_ANALYSIS_PROGRESS'; payload: AnalysisState['progress'] }
  | { type: 'ADD_NOTIFICATION'; payload: Omit<AppState['ui']['notifications'][0], 'id' | 'timestamp' | 'read'> }
  | { type: 'MARK_NOTIFICATION_READ'; payload: string }
  | { type: 'CLEAR_NOTIFICATIONS' }
  | { type: 'ADD_CUSTOM_LAYER'; payload: any }
  | { type: 'REMOVE_CUSTOM_LAYER'; payload: string };

// Initial state
const initialState: AppState = {
  user: {
    preferences: {
      defaultMapView: {
        center: [40.7259, -73.5143],
        zoom: 10,
      },
      selectedLayers: {
        parcels: true,
        lirr_stations: true,
        lirr_lines: true,
        flood_zones: true,
      },
      sidebarCollapsed: false,
      notifications: true,
    },
  },
  gisData: {
    parcels: null,
    stations: null,
    flood_zones: null,
    custom_layers: [],
    loading: {
      parcels: false,
      stations: false,
      flood_zones: false,
      custom: false,
    },
    error: {
      parcels: null,
      stations: null,
      flood_zones: null,
      custom: null,
    },
    lastUpdated: {
      parcels: null,
      stations: null,
      flood_zones: null,
    },
  },
  analysis: {
    results: {
      housing: null,
      flood: null,
      tree_canopy: null,
      custom: [],
    },
    loading: {
      housing: false,
      flood: false,
      tree_canopy: false,
      custom: false,
    },
    progress: null,
  },
  ui: {
    selectedTool: 'map',
    notifications: [],
  },
};

// Reducer
const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_USER_PREFERENCES':
      return {
        ...state,
        user: {
          ...state.user,
          preferences: {
            ...state.user.preferences,
            ...action.payload,
          },
        },
      };

    case 'SET_SELECTED_LAYERS':
      return {
        ...state,
        user: {
          ...state.user,
          preferences: {
            ...state.user.preferences,
            selectedLayers: {
              ...state.user.preferences.selectedLayers,
              ...action.payload,
            },
          },
        },
      };

    case 'TOGGLE_SIDEBAR':
      return {
        ...state,
        user: {
          ...state.user,
          preferences: {
            ...state.user.preferences,
            sidebarCollapsed: !state.user.preferences.sidebarCollapsed,
          },
        },
      };

    case 'SET_SELECTED_TOOL':
      return {
        ...state,
        ui: {
          ...state.ui,
          selectedTool: action.payload,
        },
      };

    case 'SET_GIS_DATA':
      return {
        ...state,
        gisData: {
          ...state.gisData,
          [action.payload.dataType]: action.payload.data,
          lastUpdated: {
            ...state.gisData.lastUpdated,
            [action.payload.dataType]: new Date(),
          },
          error: {
            ...state.gisData.error,
            [action.payload.dataType]: null,
          },
        },
      };

    case 'SET_GIS_LOADING':
      return {
        ...state,
        gisData: {
          ...state.gisData,
          loading: {
            ...state.gisData.loading,
            [action.payload.dataType]: action.payload.loading,
          },
        },
      };

    case 'SET_GIS_ERROR':
      return {
        ...state,
        gisData: {
          ...state.gisData,
          error: {
            ...state.gisData.error,
            [action.payload.dataType]: action.payload.error,
          },
        },
      };

    case 'SET_ANALYSIS_RESULTS':
      return {
        ...state,
        analysis: {
          ...state.analysis,
          results: {
            ...state.analysis.results,
            [action.payload.analysisType]: action.payload.results,
          },
        },
      };

    case 'SET_ANALYSIS_LOADING':
      return {
        ...state,
        analysis: {
          ...state.analysis,
          loading: {
            ...state.analysis.loading,
            [action.payload.analysisType]: action.payload.loading,
          },
        },
      };

    case 'SET_ANALYSIS_PROGRESS':
      return {
        ...state,
        analysis: {
          ...state.analysis,
          progress: action.payload,
        },
      };

    case 'ADD_NOTIFICATION':
      return {
        ...state,
        ui: {
          ...state.ui,
          notifications: [
            {
              id: `notification-${Date.now()}-${Math.random()}`,
              timestamp: new Date(),
              read: false,
              ...action.payload,
            },
            ...state.ui.notifications,
          ].slice(0, 50), // Keep only the latest 50 notifications
        },
      };

    case 'MARK_NOTIFICATION_READ':
      return {
        ...state,
        ui: {
          ...state.ui,
          notifications: state.ui.notifications.map(notification =>
            notification.id === action.payload
              ? { ...notification, read: true }
              : notification
          ),
        },
      };

    case 'CLEAR_NOTIFICATIONS':
      return {
        ...state,
        ui: {
          ...state.ui,
          notifications: [],
        },
      };

    case 'ADD_CUSTOM_LAYER':
      return {
        ...state,
        gisData: {
          ...state.gisData,
          custom_layers: [...state.gisData.custom_layers, action.payload],
        },
      };

    case 'REMOVE_CUSTOM_LAYER':
      return {
        ...state,
        gisData: {
          ...state.gisData,
          custom_layers: state.gisData.custom_layers.filter(
            layer => layer.id !== action.payload
          ),
        },
      };

    default:
      return state;
  }
};

// Context
interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  actions: {
    setUserPreferences: (preferences: Partial<UserPreferences>) => void;
    setSelectedLayers: (layers: Partial<UserPreferences['selectedLayers']>) => void;
    toggleSidebar: () => void;
    setSelectedTool: (tool: string) => void;
    setGISData: (dataType: keyof GISDataState, data: any) => void;
    setGISLoading: (dataType: keyof GISDataState['loading'], loading: boolean) => void;
    setGISError: (dataType: keyof GISDataState['error'], error: string | null) => void;
    setAnalysisResults: (analysisType: keyof AnalysisState['results'], results: any) => void;
    setAnalysisLoading: (analysisType: keyof AnalysisState['loading'], loading: boolean) => void;
    setAnalysisProgress: (progress: AnalysisState['progress']) => void;
    addNotification: (notification: Omit<AppState['ui']['notifications'][0], 'id' | 'timestamp' | 'read'>) => void;
    markNotificationRead: (id: string) => void;
    clearNotifications: () => void;
    addCustomLayer: (layer: any) => void;
    removeCustomLayer: (id: string) => void;
  };
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Provider component
interface AppProviderProps {
  children: React.ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Load user preferences from localStorage on mount
  useEffect(() => {
    const savedPreferences = localStorage.getItem('user-preferences');
    if (savedPreferences) {
      try {
        const preferences = JSON.parse(savedPreferences);
        dispatch({ type: 'SET_USER_PREFERENCES', payload: preferences });
      } catch (error) {
        console.warn('Failed to load user preferences:', error);
      }
    }
  }, []);

  // Save user preferences to localStorage when they change
  useEffect(() => {
    localStorage.setItem('user-preferences', JSON.stringify(state.user.preferences));
  }, [state.user.preferences]);

  // Action creators
  const actions = {
    setUserPreferences: (preferences: Partial<UserPreferences>) =>
      dispatch({ type: 'SET_USER_PREFERENCES', payload: preferences }),

    setSelectedLayers: (layers: Partial<UserPreferences['selectedLayers']>) =>
      dispatch({ type: 'SET_SELECTED_LAYERS', payload: layers }),

    toggleSidebar: () =>
      dispatch({ type: 'TOGGLE_SIDEBAR' }),

    setSelectedTool: (tool: string) =>
      dispatch({ type: 'SET_SELECTED_TOOL', payload: tool }),

    setGISData: (dataType: keyof GISDataState, data: any) =>
      dispatch({ type: 'SET_GIS_DATA', payload: { dataType, data } }),

    setGISLoading: (dataType: keyof GISDataState['loading'], loading: boolean) =>
      dispatch({ type: 'SET_GIS_LOADING', payload: { dataType, loading } }),

    setGISError: (dataType: keyof GISDataState['error'], error: string | null) =>
      dispatch({ type: 'SET_GIS_ERROR', payload: { dataType, error } }),

    setAnalysisResults: (analysisType: keyof AnalysisState['results'], results: any) =>
      dispatch({ type: 'SET_ANALYSIS_RESULTS', payload: { analysisType, results } }),

    setAnalysisLoading: (analysisType: keyof AnalysisState['loading'], loading: boolean) =>
      dispatch({ type: 'SET_ANALYSIS_LOADING', payload: { analysisType, loading } }),

    setAnalysisProgress: (progress: AnalysisState['progress']) =>
      dispatch({ type: 'SET_ANALYSIS_PROGRESS', payload: progress }),

    addNotification: (notification: Omit<AppState['ui']['notifications'][0], 'id' | 'timestamp' | 'read'>) =>
      dispatch({ type: 'ADD_NOTIFICATION', payload: notification }),

    markNotificationRead: (id: string) =>
      dispatch({ type: 'MARK_NOTIFICATION_READ', payload: id }),

    clearNotifications: () =>
      dispatch({ type: 'CLEAR_NOTIFICATIONS' }),

    addCustomLayer: (layer: any) =>
      dispatch({ type: 'ADD_CUSTOM_LAYER', payload: layer }),

    removeCustomLayer: (id: string) =>
      dispatch({ type: 'REMOVE_CUSTOM_LAYER', payload: id }),
  };

  const value: AppContextType = {
    state,
    dispatch,
    actions,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

// Hook to use the app context
export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};