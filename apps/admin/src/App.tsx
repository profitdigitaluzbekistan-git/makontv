import React from 'react';
import { Refine } from '@refinedev/core';
import { ThemedLayoutV2, ThemedSiderV2, useNotificationProvider } from '@refinedev/antd';
import routerProvider, { NavigateToResource, UnsavedChangesNotifier } from '@refinedev/react-router-v6';
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import { ConfigProvider, theme, App as AntApp } from 'antd';
import {
  PlayCircleOutlined, VideoCameraOutlined, TagOutlined,
  TeamOutlined, AppstoreOutlined, UserOutlined,
  BellOutlined, CrownOutlined, DashboardOutlined,
  OrderedListOutlined, UnorderedListOutlined,
} from '@ant-design/icons';

import '@refinedev/antd/dist/reset.css';

import { dataProvider } from './providers/dataProvider';
import { LoginGate } from './components/LoginGate';
import { DashboardPage } from './pages/dashboard';
import { AnalyticsPage } from './pages/dashboard/analytics';
import { MovieList } from './pages/movies/list';
import { MovieCreate, MovieEdit } from './pages/movies/form';
import { GenreList, GenreCreate, GenreEdit } from './pages/genres';
import { SeriesList, SeriesCreate, SeriesEdit } from './pages/series';
import { PersonList, PersonCreate, PersonEdit } from './pages/persons';
import { SeasonList, SeasonCreate, SeasonEdit, EpisodeList, EpisodeCreate, EpisodeEdit } from './pages/episodes';
import { CollectionList, CollectionCreate, CollectionEdit } from './pages/collections';
import { UserList, UserEdit } from './pages/users';
import { NotificationList, NotificationCreate } from './pages/notifications';
import { BroadcastPage } from './pages/notifications/broadcast';
import { PlanList, PlanCreate, PlanEdit } from './pages/plans';

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
                name: 'analytics',
                list: '/analytics',
                meta: { label: 'Аналитика', icon: <DashboardOutlined /> },
              },
              {
                name: 'movies',
                list: '/movies',
                create: '/movies/create',
                edit: '/movies/edit/:id',
                meta: { label: 'Фильмы', icon: <PlayCircleOutlined /> },
              },
              {
                name: 'series',
                list: '/series',
                create: '/series/create',
                edit: '/series/edit/:id',
                meta: { label: 'Сериалы', icon: <VideoCameraOutlined /> },
              },
              {
                name: 'seasons',
                list: '/seasons',
                create: '/seasons/create',
                edit: '/seasons/edit/:id',
                meta: { label: 'Сезоны', icon: <OrderedListOutlined /> },
              },
              {
                name: 'episodes',
                list: '/episodes',
                create: '/episodes/create',
                edit: '/episodes/edit/:id',
                meta: { label: 'Эпизоды', icon: <UnorderedListOutlined /> },
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
                meta: { label: 'Персоны', icon: <TeamOutlined /> },
              },
              {
                name: 'collections',
                list: '/collections',
                create: '/collections/create',
                edit: '/collections/edit/:id',
                meta: { label: 'Подборки', icon: <AppstoreOutlined /> },
              },
              {
                name: 'plans',
                list: '/plans',
                create: '/plans/create',
                edit: '/plans/edit/:id',
                meta: { label: 'Тарифы', icon: <CrownOutlined /> },
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

                <Route path="/movies" element={<MovieList />} />
                <Route path="/movies/create" element={<MovieCreate />} />
                <Route path="/movies/edit/:id" element={<MovieEdit />} />

                <Route path="/series" element={<SeriesList />} />
                <Route path="/series/create" element={<SeriesCreate />} />
                <Route path="/series/edit/:id" element={<SeriesEdit />} />

                <Route path="/seasons" element={<SeasonList />} />
                <Route path="/seasons/create" element={<SeasonCreate />} />
                <Route path="/seasons/edit/:id" element={<SeasonEdit />} />

                <Route path="/episodes" element={<EpisodeList />} />
                <Route path="/episodes/create" element={<EpisodeCreate />} />
                <Route path="/episodes/edit/:id" element={<EpisodeEdit />} />

                <Route path="/genres" element={<GenreList />} />
                <Route path="/genres/create" element={<GenreCreate />} />
                <Route path="/genres/edit/:id" element={<GenreEdit />} />

                <Route path="/persons" element={<PersonList />} />
                <Route path="/persons/create" element={<PersonCreate />} />
                <Route path="/persons/edit/:id" element={<PersonEdit />} />

                <Route path="/collections" element={<CollectionList />} />
                <Route path="/collections/create" element={<CollectionCreate />} />
                <Route path="/collections/edit/:id" element={<CollectionEdit />} />

                <Route path="/plans" element={<PlanList />} />
                <Route path="/plans/create" element={<PlanCreate />} />
                <Route path="/plans/edit/:id" element={<PlanEdit />} />

                <Route path="/users" element={<UserList />} />
                <Route path="/users/edit/:id" element={<UserEdit />} />

                <Route path="/notifications" element={<NotificationList />} />
                <Route path="/notifications/create" element={<NotificationCreate />} />
                <Route path="/notifications/broadcast" element={<BroadcastPage />} />
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
