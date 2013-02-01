using Newtonsoft.Json.Linq;
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Threading.Tasks;
using Vidyano.Common;
using Windows.Foundation;
using Windows.Storage;
using Windows.Storage.Pickers;
using Windows.Storage.Streams;
using Windows.UI;
using Windows.UI.Popups;
using Windows.UI.ViewManagement;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;

namespace Vidyano.ViewModel.Actions
{
    public class ActionBase : NotifyableBase
    {
        private static readonly ConcurrentDictionary<string, ConstructorInfo> actionConstructors = new ConcurrentDictionary<string, ConstructorInfo>();

        protected internal readonly Definition definition;
        private bool _CanExecute, _IsVisible = true;

        protected internal ActionBase(Definition definition, PersistentObject parent, Query query = null)
        {
            this.definition = definition;
            Parent = parent;
            Query = query;

            Options = definition.Options;

            Command = new Commands.ActionCommand(async obj =>
            {
                if (Options != null && Options.Length > 0)
                {
                    var button = obj as Button;
                    if (button != null)
                    {
                        var popupMenu = new PopupMenu();
                        foreach (var option in Options)
                            popupMenu.Commands.Add(new UICommand(option, async c => await Execute(c.Label)));

                        var point = button.TransformToVisual(null).TransformPoint(new Point(button.ActualWidth, 0d));
                        await popupMenu.ShowAsync(point);
                        return;
                    }
                }

                await Execute(null);
            }, _ => CanExecute, this, "CanExecute");

            CanExecute = query == null;
        }

        public string DisplayName { get { return definition.DisplayName; } }

        public bool IsPinned { get { return definition.IsPinned; } }

        public string[] Options { get; protected set; }

        public string Icon
        {
            get
            {
                return definition.Name + "_ActionIcon";
            }
        }

        public PersistentObject Parent { get; private set; }

        public Query Query { get; private set; }

        public Commands.ActionCommand Command { get; private set; }

        public bool IsVisible { get { return _IsVisible; } set { SetProperty(ref _IsVisible, value); } }

        public bool CanExecute { get { return _CanExecute; } set { SetProperty(ref _CanExecute, value); } }

        internal virtual Definition[] DependentActions { get { return new Definition[0]; } }

        internal virtual void Initialize() { }

        public virtual async Task Execute(object option)
        {
            var index = Array.IndexOf(Options, Convert.ToString(option));
            var parameters = new Dictionary<string, string> { { "MenuOption", Service.ToServiceString(index) } };
            parameters["MenuLabel"] = Service.ToServiceString(option);
            //if (Query != null && !string.IsNullOrEmpty(Query.FilterDisplayName))
            //    parameters["QueryFilterName"] = Query.FilterDisplayName;

            var selectedItems = Query != null && Query.Items != null ? Query.SelectedItems.ToArray() : new QueryResultItem[0];
            var po = await Service.Current.ExecuteActionAsync((this is QueryAction ? "Query" : "PersistentObject") + "." + definition.Name, Parent, Query, selectedItems, parameters);

            if (po != null)
            {
                if (po.FullTypeName == "Vidyano.Notification")
                {
                    if (Query != null)
                        Query.SetNotification(po.Notification, po.NotificationType);
                    else if (Parent != null)
                        Parent.SetNotification(po.Notification, po.NotificationType);
                }
                else if (po.HasNotification && po.NotificationType == NotificationType.Error)
                {
                    if (Query != null)
                        Query.SetNotification(po.Notification, po.NotificationType);
                    else if (Parent != null)
                    {
                        Parent.SetNotification(po.Notification, po.NotificationType);

                        if ((po.FullTypeName == Parent.FullTypeName || po.IsNew == Parent.IsNew) && po.Id == Parent.Id && po.ObjectId == Parent.ObjectId)
                            await Parent.RefreshFromResult(po);
                    }
                }
                else if (po.FullTypeName == "Vidyano.RegisteredStream")
                {
                    try
                    {
                        var stream = await Service.Current.GetStreamAsync(po);
                        if (stream != null && stream.Item1 != null)
                        {
                            try
                            {
                                if (((ApplicationView.Value != ApplicationViewState.Snapped) || ApplicationView.TryUnsnap()))
                                {
                                    var fileName = !string.IsNullOrEmpty(stream.Item2) ? stream.Item2 : "unknown.bin";

                                    var savePicker = new FileSavePicker();
                                    savePicker.FileTypeChoices.Add(Service.Current.Messages["File"], new List<string>() { fileName.Substring(fileName.LastIndexOf('.')) });
                                    savePicker.SuggestedStartLocation = PickerLocationId.DocumentsLibrary;
                                    savePicker.SuggestedFileName = fileName;

                                    var file = await savePicker.PickSaveFileAsync();
                                    if (file != null)
                                    {
                                        using (var fileStream = await file.OpenAsync(FileAccessMode.ReadWrite))
                                        {
                                            using (var outputStream = fileStream.AsStreamForWrite())
                                            {
                                                await stream.Item1.CopyToAsync(outputStream);
                                                await outputStream.FlushAsync();
                                            }
                                        }
                                    }
                                }
                            }
                            finally
                            {
                                stream.Item1.Dispose();
                            }
                        }
                    }
                    catch (Exception e)
                    {
                        var qAction = this as QueryAction;
                        if (qAction != null)
                            qAction.Query.SetNotification(e.Message);
                        else if (Parent != null)
                            Parent.SetNotification(e.Message);
                    }
                }
                else if (Parent == null || (po.FullTypeName != Parent.FullTypeName && po.IsNew != Parent.IsNew) || po.Id != Parent.Id || po.ObjectId != Parent.ObjectId)
                {
                    po.OwnerQuery = Query;
                    ((System.Windows.Input.ICommand)new Commands.Navigate()).Execute(po);
                }
                else
                {
                    Parent.SetNotification(po.Notification, po.NotificationType);
                    await Parent.RefreshFromResult(po);
                }
            }

            if (definition.RefreshQueryOnCompleted && Query != null)
                await Query.RefreshQueryAsync();
        }

        internal static ActionBase[] GetActions(JToken actionsToken, PersistentObject parent, Query query = null)
        {
            var actions = new List<ActionBase>();
            var actionDefinitions = actionsToken.Select(action =>
            {
                var actionName = (string)action;
                if (actionName == "Edit" && parent != null && parent.IsNew)
                    actionName = "Save";

                return Service.Current.Actions.FirstOrDefault(a => a.Key == actionName);
            }).Where(a => a.Value != null).OrderBy(a => a.Value.Offset).ToArray();

            foreach (var actionDefinition in actionDefinitions)
            {
                var action = GetAction(actionDefinition.Value, parent, query);
                if (action != null)
                {
                    actions.Add(action);
                    foreach (var dependentActionDefinition in action.DependentActions)
                    {
                        action = GetAction(dependentActionDefinition, parent, query);
                        if (action != null)
                            actions.Add(action);
                    }
                }
            }

            return actions.ToArray();
        }

        internal static ActionBase GetAction(Definition definition, PersistentObject parent, Query query = null)
        {
            var constructor = actionConstructors.GetOrAdd(definition.Name, n =>
                {
                    return (typeof(ActionBase).GetTypeInfo().Assembly.GetType("Vidyano.ViewModel.Actions." + n) ?? (query == null ? typeof(ActionBase) : typeof(QueryAction))).GetTypeInfo().DeclaredConstructors.First();
                });

            return constructor.Invoke(new object[] { definition, parent, query }) as ActionBase;
        }

        internal static void ArrangeActions(ActionBase[] normalActions, ActionBase[] pinndActions, out ActionBase[] leftActions, out ActionBase[] rightActions)
        {
            if (Settings.Current.NormalActionsAlignment == Settings.NormalActionsAlignmentEnum.Right)
            {
                leftActions = (pinndActions ?? new ActionBase[0]).OrderByDescending(a => a.definition.Offset).ToArray();
                rightActions = (normalActions ?? new ActionBase[0]).OrderByDescending(a => a.definition.Offset).ToArray();
            }
            else
            {
                leftActions = normalActions;
                rightActions = pinndActions;
            }
        }

        protected internal class Definition
        {
            public string Name { get; set; }

            public string DisplayName { get; set; }

            public bool IsPinned { get; set; }

            public bool RefreshQueryOnCompleted { get; set; }

            public int Offset { get; set; }

            public string[] Options { get; set; }

            public Func<int, bool> SelectionRule { get; set; }
        }

        protected internal void OpenActionsBar(bool asSticky = false)
        {
            if (Query == null && Parent != null)
            {
                Parent.IsActionsBarSticky = asSticky;
                Parent.IsActionsBarOpen = true;
            }
            else if (Query != null)
            {
                Query.IsActionsBarSticky = asSticky;
                Query.IsActionsBarOpen = true;
            }
        }

        protected internal void CloseActionsBar()
        {
            if (Query == null && Parent != null)
            {
                Parent.IsActionsBarSticky = false;
                Parent.IsActionsBarOpen = false;
            }
            else if (Query != null)
            {
                Query.IsActionsBarSticky = false;
                Query.IsActionsBarOpen = false;
            }
        }
    }
}