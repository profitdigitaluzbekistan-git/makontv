import React from 'react';
import { Refine } from '@refinedev/core';
import { ThemedLayoutV2, ThemedSiderV2, useNotificationProvider } from '@refinedev/antd';
import routerProvider, { NavigateToResource, UnsavedChangesNotifier } from '@refinedev/react-router-v6';
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import { ConfigProvider, theme, App as AntApp } from 'antd';
import {
  PlayCircleOutlined, VideoCameraOutlined, TagOutlined,
  TeamOutlined, UserOutlined, BellOutlined, DashboardOutlined,
  SettingOutlined,
} from '@ant-design/icons';

import '@refinedev/antd/dist/reset.css';

import { dataProvider } from './providers/dataProvider';
import { LoginGate } from './components/LoginGate';
import { DashboardPage } from './pages/dashboard';
import { AnalyticsPage } from './pages/dashboard/analytics';
import { ContentPage } from './pages/content';
import { MovieList } from './pages/movies/list';
import { MovieCreate, MovieEdit } from './pages/movies/form';
import { GenreList, GenreCreate, GenreEdit } from './pages/genres';
import { SeriesList, SeriesCreate, SeriesEdit } from './pages/series';
import { PersonList, PersonCreate, PersonEdit } from './pages/persons';
import { CollectionList, CollectionCreate, CollectionEdit } from './pages/collections';
import { UserList, UserEdit } from './pages/users';
import { NotificationList, NotificationCreate } from './pages/notifications';
import { BroadcastPage } from './pages/notifications/broadcast';
import { PlanList, PlanCreate, PlanEdit } from './pages/plans';
import { SettingsPage } from './pages/settings';

const AppContent: React.FC = () => {
  return (
    <BrowserRouter>
      <ConfigProvider theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#6bf1f6',
          colorBgBase: '#0f0f1a',
          colorBgContainer: '#1a1a2e',
          borderRadius: 8,
        },
      }}>
        <AntApp>
          <Refine
            dataProvider={dataProvider}
            routerProvider={routerProvider}
            notificationProvider={useNotificationProvider}
            resources={[
              {
                name: 'dashboard',
                list: '/dashboard',
                meta: { label: 'Дашборд', icon: <DashboardOutlined /> },
              },
              {
                name: 'content',
                list: '/content',
                meta: { label: 'Контент', icon: <VideoCameraOutlined /> },
              },
              {
                name: 'movies',
                list: '/movies',
                create: '/movies/create',
                edit: '/movies/edit/:id',
                meta: { parent: 'content', hide: true },
              },
              {
                name: 'series',
                list: '/series',
                create: '/series/create',
                edit: '/series/edit/:id',
                meta: { parent: 'content', hide: true },
              },
              {
                name: 'genres',
                list: '/genres',
                create: '/genres/create',
                edit: '/genres/edit/:id',
                meta: { label: 'Жанры', icon: <TagOutlined /> },
              },
              {
                name: 'persons',
                list: '/persons',
                create: '/persons/create',
                edit: '/persons/edit/:id',
                meta: { label: 'Актёры и съёмочная группа', icon: <TeamOutlined /> },
              },
              {
                name: 'users',
                list: '/users',
                edit: '/users/edit/:id',
                meta: { label: 'Пользователи', icon: <UserOutlined /> },
              },
              {
                name: 'notifications',
                list: '/notifications',
                create: '/notifications/create',
                meta: { label: 'Уведомления', icon: <BellOutlined /> },
              },
              {
                name: 'settings',
                list: '/settings',
                meta: { label: 'Настройки', icon: <SettingOutlined /> },
              },
            ]}
          >
            <Routes>
              <Route element={
                <ThemedLayoutV2
                  Sider={() => <ThemedSiderV2 title="MakonTV" />}
                >
                  <Outlet />
                </ThemedLayoutV2>
              }>
                <Route index element={<NavigateToResource resource="dashboard" />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/analytics" element={<AnalyticsPage />} />

                <Route path="/content" element={<ContentPage />} />

                <Route path="/movies" element={<MovieList />} />
                <Route path="/movies/create" element={<MovieCreate />} />
                <Route path="/movies/edit/:id" element={<MovieEdit />} />

                <Route path="/series" element={<SeriesList />} />
                <Route path="/series/create" element={<SeriesCreate />} />
                <Route path="/series/edit/:id" element={<SeriesEdit />} />

                <Route path="/genres" element={<GenreList />} />
                <Route path="/genres/create" element={<GenreCreate />} />
                <Route path="/genres/edit/:id" element={<GenreEdit />} />

                <Route path="/persons" element={<PersonList />} />
                <Route path="/persons/create" element={<PersonCreate />} />
                <Route path="/persons/edit/:id" element={<PersonEdit />} />

                <Route path="/users" element={<UserList />} />
                <Route path="/users/edit/:id" element={<UserEdit />} />

                <Route path="/notifications" element={<NotificationList />} />
                <Route path="/notifications/create" element={<NotificationCreate />} />
                <Route path="/notifications/broadcast" element={<BroadcastPage />} />

                <Route path="/settings" element={<SettingsPage />} />

                {/* Keep plan/collection routes for create/edit navigations */}
                <Route path="/plans" element={<PlanList />} />
                <Route path="/plans/create" element={<PlanCreate />} />
                <Route path="/plans/edit/:id" element={<PlanEdit />} />
                <Route path="/collections" element={<CollectionList />} />
                <Route path="/collections/create" element={<CollectionCreate />} />
                <Route path="/collections/edit/:id" element={<CollectionEdit />} />
              </Route>
            </Routes>
            <UnsavedChangesNotifier />
          </Refine>
        </AntApp>
      </ConfigProvider>
    </BrowserRouter>
  );
};

export const App: React.FC = () => (
  <LoginGate>
    <AppContent />
  </LoginGate>
);
