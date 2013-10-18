using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Linq;
using System.Windows;
using Microsoft.Phone.Controls;
using Microsoft.Phone.Shell;
using Vidyano.Common;
using Vidyano.ViewModel.Actions;

namespace Vidyano.ViewModel.Pages
{
    sealed class ActionsManager : IDisposable
    {
        private readonly Dictionary<ActionBase, IApplicationBarMenuItem> actionButtons = new Dictionary<ActionBase, IApplicationBarMenuItem>();
        private readonly ActionBase[] actions;
        private readonly PhoneApplicationPage page;
        private readonly ActionBase[] pinnedActions;
        private readonly List<ApplicationBarIconButton> homePageButtons = new List<ApplicationBarIconButton>();
        private readonly List<ApplicationBarMenuItem> homePageMenuItems = new List<ApplicationBarMenuItem>();

        public ActionsManager(VidyanoPage page, ActionBase[] actions, ActionBase[] pinnedActions)
        {
            this.page = page.Page;
            this.actions = actions;
            this.pinnedActions = pinnedActions;

            if( (Settings.Current.StartupPageType == Settings.StartupPageTypeEnum.PersistenObjectPage && page is PersistentObjectPage && ((PersistentObjectPage)page).PersistentObject.Type == Settings.Current.StartupPageArgument) ||
                (Settings.Current.StartupPageType == Settings.StartupPageTypeEnum.QueryPage && page is QueryPage && ((QueryPage)page).Query.Name == Settings.Current.StartupPageArgument))
                ((PhoneHooks)Service.Current.Hooks).OnCreateHomePageApplicationBar(homePageButtons, homePageMenuItems);

            GenerateActionBar();

            actions.Run(a => a.PropertyChanged += ActionPropertyChanged);
            pinnedActions.Run(a => a.PropertyChanged += ActionPropertyChanged);
        }

        public void Dispose()
        {
            actionButtons.Run(ab => ab.Key.PropertyChanged -= ActionPropertyChanged);
            ClearActionButtons();
        }

        private void GenerateActionBar()
        {
            ApplicationBar appBar = null;

            ClearActionButtons();

            var visibleActions = actions.Where(a => a.IsVisible && a.CanExecute).ToArray();
            var visiblePinnedActions = pinnedActions.Where(a => a.IsVisible && a.CanExecute).ToArray();

            if (visibleActions.Length > 0 || visiblePinnedActions.Length > 0 || homePageButtons.Count > 0 || homePageMenuItems.Count > 0)
            {
                appBar = new ApplicationBar();
                appBar.Opacity = 1d;
                appBar.IsVisible = true;

                var fixedActions = new List<ActionBase>();
                visibleActions.Take(2).Run(fixedActions.Add);
                var filterAction = visibleActions.FirstOrDefault(a => a.Name == "Filter");
                if (filterAction != null)
                    fixedActions.Add(filterAction);
                var refreshQueryAction = pinnedActions.FirstOrDefault(a => a.Name == "RefreshQuery");
                if (refreshQueryAction != null)
                    fixedActions.Add(refreshQueryAction);

                fixedActions.Run(action => AddButton(action, appBar));

                foreach (var action in visibleActions)
                {
                    if (appBar.Buttons.Count < 4)
                        AddButton(action, appBar);
                    else
                        AddMenu(action, appBar);
                }

                visiblePinnedActions.Run(action => AddMenu(action, appBar));

                homePageButtons.ForEach(hpB => appBar.Buttons.Add(hpB));
                homePageMenuItems.ForEach(hpMI => appBar.MenuItems.Add(hpMI));

                appBar.Mode = appBar.Buttons.Count > 0 ? ApplicationBarMode.Default : ApplicationBarMode.Minimized;
                appBar.IsMenuEnabled = appBar.MenuItems.Count > 0;
            }

            page.ApplicationBar = appBar;
        }

        private void AddButton(ActionBase action, ApplicationBar appBar)
        {
            if (action == null || actionButtons.ContainsKey(action))
                return;

            var btn = new ApplicationBarIconButton();
            btn.IconUri = new Uri("/Assets/ActionIcons/" + action.Name + ".png", UriKind.RelativeOrAbsolute);
            btn.Text = action.DisplayName;
            btn.Click += Action_Clicked;
            btn.IsEnabled = action.CanExecute;
            appBar.Buttons.Add(btn);

            actionButtons[action] = btn;
        }

        private void AddMenu(ActionBase action, ApplicationBar appBar)
        {
            if (action == null || actionButtons.ContainsKey(action))
                return;

            var menuItem = new ApplicationBarMenuItem();
            menuItem.Text = action.DisplayName;
            menuItem.Click += Action_Clicked;
            menuItem.IsEnabled = action.CanExecute;
            appBar.MenuItems.Add(menuItem);

            actionButtons[action] = menuItem;
        }

        private void ClearActionButtons()
        {
            actionButtons.Run(ab => ab.Value.Click -= Action_Clicked);
            actionButtons.Clear();
        }

        private async void Action_Clicked(object sender, EventArgs e)
        {
            var actionButton = sender as IApplicationBarMenuItem;
            if (actionButton == null)
                return;

            var action = actionButtons.Where(ab => ab.Value == actionButton).Select(ab => ab.Key).FirstOrDefault();
            if (action == null)
                return;

            if (action.CanExecute)
            {
                if (action.Options == null || action.Options.Length == 0)
                    await action.Execute(-1);
                else if (action.Options.Length == 1)
                    await action.Execute(action.Options[0]);
                else
                {
                    var menu = new ContextMenu();
                    menu.VerticalAlignment = VerticalAlignment.Bottom;
                    action.Options.Run(o =>
                    {
                        var menuItem = new MenuItem { DataContext = action, Header = o };
                        menuItem.Click += async (_, __) => await action.Execute(o);
                        menu.Items.Add(menuItem);
                    });

                    ContextMenuService.SetContextMenu(page, menu);
                    RoutedEventHandler closed = null;

                    closed = (_, __) =>
                    {
                        ContextMenuService.SetContextMenu(page, null);
                        menu.Closed -= closed;
                    };

                    menu.Closed += closed;
                    menu.IsOpen = true;
                }
            }
        }

        private void ActionPropertyChanged(object sender, PropertyChangedEventArgs e)
        {
            GenerateActionBar();
        }
    }
}