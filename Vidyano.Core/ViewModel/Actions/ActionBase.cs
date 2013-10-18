using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Threading.Tasks;
using System.Windows.Input;
using Newtonsoft.Json.Linq;
using Vidyano.Commands;
using Vidyano.Common;

namespace Vidyano.ViewModel.Actions
{
    public class ActionBase : NotifyableBase
    {
        private static readonly Dictionary<string, ConstructorInfo> actionConstructors = new Dictionary<string, ConstructorInfo>();

        protected internal readonly Definition definition;
        private bool _CanExecute, _IsVisible = true;

        protected internal ActionBase(Definition definition, PersistentObject parent, Query query = null)
        {
            this.definition = definition;
            Parent = parent;
            Query = query;

            Options = definition.Options;

            Command = new ActionCommand(async obj => await Service.Current.Hooks.OnActionCommand(this, obj), _ => CanExecute, this, "CanExecute");

            CanExecute = query == null;
        }

        public string DisplayName
        {
            get { return definition.DisplayName; }
        }

        public bool IsPinned
        {
            get { return definition.IsPinned; }
        }

        public string[] Options { get; protected set; }

        internal int Offset { get; private set; }

        internal bool IsDependent { get; private set; }

        public string Icon
        {
            get { return "ActionIcon." + definition.Name; }
        }

        public string Name
        {
            get { return definition.Name; }
        }

        public PersistentObject Parent { get; private set; }

        public Query Query { get; private set; }

        public bool IsVisible
        {
            get { return _IsVisible; }
            set { SetProperty(ref _IsVisible, value); }
        }

        public bool CanExecute
        {
            get { return _CanExecute; }
            set { SetProperty(ref _CanExecute, value); }
        }

        public bool HasSelectionRule
        {
            get { return definition.SelectionRule != ExpressionParser.AlwaysTrue; }
        }

        internal virtual Definition[] DependentActions
        {
            get { return new Definition[0]; }
        }

        public ICommand Command { get; private set; }
        internal virtual void Initialize() {}

        public virtual async Task Execute(object option)
        {
            var index = Array.IndexOf(Options, Convert.ToString(option));
            var parameters = new Dictionary<string, string> { { "MenuOption", Service.ToServiceString(index) } };
            parameters["MenuLabel"] = Service.ToServiceString(option);
            //if (Query != null && !string.IsNullOrEmpty(Query.FilterDisplayName))
            //    parameters["QueryFilterName"] = Query.FilterDisplayName;

            var selectedItems = Query != null && Query.Count > 0 ? Query.SelectedItems.ToArray() : new QueryResultItem[0];
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
                                Service.Current.Hooks.OnStream(stream.Item2, stream.Item1);
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
                    Service.Current.Hooks.OnOpen(po);
                }
                else
                {
                    Parent.SetNotification(po.Notification, po.NotificationType);
                    await Parent.RefreshFromResult(po);
                }
            }

            if (definition.RefreshQueryOnCompleted && Query != null && !Query.HasNotification)
            {
                await Query.RefreshQueryAsync();

                if (Query.SemanticZoomOwner != null)
                    await Query.SemanticZoomOwner.RefreshQueryAsync();
            }
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
                    var parentOffset = action.Offset = actions.Count;
                    actions.Add(action);
                    foreach (var dependentActionDefinition in action.DependentActions)
                    {
                        action = GetAction(dependentActionDefinition, parent, query);
                        if (action != null)
                        {
                            action.Offset = parentOffset;
                            action.IsDependent = true;
                            actions.Add(action);
                        }
                    }
                }
            }

            return actions.ToArray();
        }

        internal static ActionBase GetAction(Definition definition, PersistentObject parent, Query query = null)
        {
            var constructor = actionConstructors.GetOrAdd(definition.Name + ";" + (query == null), n =>
            {
                var hooksType = Service.Current.Hooks.GetType();
                var actionType = hooksType.GetTypeInfo().Assembly.GetType("Vidyano.ViewModel.Actions." + definition.Name);
                while (actionType == null && hooksType != typeof(object))
                {
                    hooksType = hooksType.GetTypeInfo().BaseType;
                    actionType = hooksType.GetTypeInfo().Assembly.GetType("Vidyano.ViewModel.Actions." + definition.Name);
                }

                return (actionType ?? (query == null ? typeof(ActionBase) : typeof(QueryAction))).GetTypeInfo().DeclaredConstructors.First();
            });

            return constructor.Invoke(new object[] { definition, parent, query }) as ActionBase;
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
    }
}