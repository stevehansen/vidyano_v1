using System.Threading.Tasks;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using Vidyano.Common;
using Vidyano.ViewModel.Actions;

namespace Vidyano.ViewModel
{
    [DebuggerDisplay("PersistentObject {Type}")]
    public class PersistentObject : ViewModelBase
    {
        internal PersistentObject(JObject model) :
            base(model)
        {
            JToken attributesToken;
            if (model.TryGetValue("attributes", out attributesToken))
            {
                var attributes = (JArray)attributesToken;
                Attributes = attributes.Select(jAttr => jAttr["lookup"] != null ? new PersistentObjectAttributeWithReference((JObject)jAttr, this) : new PersistentObjectAttribute((JObject)jAttr, this)).ToArray();
            }
            else
                Attributes = new PersistentObjectAttribute[0];

            JToken queriesToken;
            if (model.TryGetValue("queries", out queriesToken))
            {
                var queries = (JArray)queriesToken;
                Queries = queries.Select(jQuery /* :-) */ => new Query((JObject)jQuery, this)).ToArray();
            }
            else
                Queries = new Query[0];

            var parent = (JObject)model["parent"];
            if (parent != null)
                Parent = new PersistentObject(parent);

            // Initialize Tabs and Groups
            var tabIndex = 0;
            var attributeTabs = !IsHidden ? Attributes.OrderBy(attr => attr.Offset).GroupBy(attr => attr.Tab).Select(tab =>
                {
                    var groups = tab.OrderBy(attr => attr.Offset).GroupBy(attr => attr.GroupName).Select(group => new PersistentObjectAttributeGroup(group.Key, group.ToArray())).ToArray();
                    return (PersistentObjectTab)new PersistentObjectTabAttributes(groups.SelectMany(g => g.Attributes).ToArray(), string.IsNullOrEmpty(tab.Key) ? Label : tab.Key, this) { Index = tabIndex++ };
                }) : new PersistentObjectTabAttributes[0];

            Tabs = attributeTabs.Concat(Queries.OrderBy(q => q.Offset).Select(q => new PersistentObjectTabQuery(q) { Index = tabIndex++ })).ToArray();

            if (!IsHidden)
            {
                // Initialize Action
                JToken actionsToken;
                if (model.TryGetValue("actions", out actionsToken))
                {
                    var actions = ViewModel.Actions.ActionBase.GetActions(actionsToken, this);

                    Actions = actions.Where(a => !a.IsPinned).ToArray();
                    PinnedActions = actions.Where(a => a.IsPinned).ToArray();
                }
                Actions.Run(a => a.Initialize());
            }
            else
                Actions = new ActionBase[0];

            // Also check IsInEdit (Object could have been reconstructed after suspend/resume)
            IsInEdit = IsInEdit || IsNew || StateBehavior.HasFlag(StateBehavior.OpenInEdit) || StateBehavior.HasFlag(StateBehavior.StayInEdit);
            IsDirty = IsDirty; // Also triggers reconstructed changes

            // Specials
            HasNotification = !string.IsNullOrWhiteSpace(Notification);

            ((Client)Client.Current).Hooks.OnConstruct(this);
        }

        public string Id { get { return GetProperty<string>(); } }

        public string ObjectId { get { return GetProperty<string>(); } private set { SetProperty(value); } }

        public string Breadcrumb { get { return GetProperty<string>(); } private set { SetProperty(value); } }

        public bool IsHidden { get { return GetProperty<bool>(); } }

        public bool IsNew { get { return GetProperty<bool>(); } private set { SetProperty(value); } }

        public string Label { get { return GetProperty<string>(); } }

        public string NewOptions { get { return GetProperty<string>(); } }

        public string Notification
        {
            get { return GetProperty<string>(); }
            private set
            {
                if (SetProperty(value))
                    HasNotification = !string.IsNullOrWhiteSpace(value);
            }
        }

        public NotificationType NotificationType { get { return (NotificationType)Enum.Parse(typeof(NotificationType), GetProperty<string>()); } private set { SetProperty(value.ToString()); } }

        public bool HasNotification { get { return GetProperty<bool>(); } private set { SetProperty(value); } }

        public StateBehavior StateBehavior { get { return (StateBehavior)Enum.Parse(typeof(StateBehavior), GetProperty<string>()); } }

        public string Type { get { return GetProperty<string>(); } }

        public string FullTypeName { get { return GetProperty<string>(); } }

        public PersistentObjectAttribute[] Attributes { get; private set; }

        public Query[] Queries { get; private set; }

        public PersistentObject Parent { get; private set; }

        public Query OwnerQuery { get; internal set; }

        public PersistentObjectAttributeWithReference OwnerAttributeWithReference { get; internal set; }

        public PersistentObjectAttribute this[string name]
        {
            get { return GetAttribute(name); }
        }

        public PersistentObjectTab[] Tabs { get; private set; }

        public ActionBase[] Actions { get; private set; }

        public ActionBase[] PinnedActions { get; private set; }

        public bool HasActions
        {
            get
            {
                return Actions != null && Actions.Length > 0 && Actions.Any(a => a.IsVisible) || PinnedActions != null && PinnedActions.Length > 0 && PinnedActions.Any(a => a.IsVisible);
            }
        }

        public bool IsActionsBarOpen { get { return GetProperty<bool>(); } internal set { SetProperty(value && HasActions); } }

        public bool IsActionsBarSticky { get { return GetProperty<bool>(); } internal set { SetProperty(value && HasActions); } }

        public bool IsInEdit
        {
            get { return GetProperty<bool>(); }
            internal set
            {
                if (SetProperty(value) && value)
                {
                    // Back-up
                    BackupSecurityToken = SecurityToken;
                    Attributes.Run(a => a.BackupBeforeEdit());
                }

                if (Actions != null)
                {
                    var cancelEdit = Actions.OfType<CancelEdit>().FirstOrDefault();
                    if (cancelEdit != null)
                        cancelEdit.CanExecute = value;

                    var endEdit = Actions.OfType<EndEdit>().FirstOrDefault();
                    if (endEdit != null)
                        endEdit.IsVisible = value;

                    var edit = Actions.OfType<Edit>().FirstOrDefault();
                    if (edit != null)
                        edit.IsVisible = !value;
                }

                IsActionsBarSticky = value;
                IsActionsBarOpen = value;
            }
        }

        internal string[] QueriesToRefresh { get { return GetProperty<string[]>(); } }

        public void CancelEdit()
        {
            if (!IsInEdit)
                return;

            SecurityToken = BackupSecurityToken;
            Attributes.Run(a => a.RestoreEditBackup());
            IsDirty = false;

            if (!StateBehavior.HasFlag(StateBehavior.StayInEdit))
                IsInEdit = false;
        }

        public void Edit()
        {
            IsInEdit = true;
        }

        public async Task Save()
        {
            try
            {
                var result = await Service.Current.ExecuteActionAsync("PersistentObject.Save", this);

                await RefreshFromResult(result);

                if (string.IsNullOrWhiteSpace(Notification) || NotificationType != NotificationType.Error)
                {
                    IsDirty = false;
                    IsInEdit = StateBehavior.HasFlag(StateBehavior.StayInEdit);

                    if (OwnerAttributeWithReference != null)
                    {
                        if (OwnerAttributeWithReference.ObjectId != ObjectId)
                        {
                            OwnerAttributeWithReference.Parent.Edit();

                            var fakeSelectedItem = new JObject(new JProperty("id", ObjectId), new JProperty("values", new JArray()));
                            await OwnerAttributeWithReference.ChangeReference(new QueryResultItem(fakeSelectedItem, OwnerAttributeWithReference.Lookup));
                        }
                    }
                    else if (OwnerQuery != null)
                    {
                        await OwnerQuery.RefreshQueryAsync();

                        if (OwnerQuery.SemanticZoomOwner != null)
                            await OwnerQuery.SemanticZoomOwner.RefreshQueryAsync();
                    }
                }
            }
            catch (Exception ex)
            {
                SetNotification(ex.Message);
            }
        }

        public bool IsDirty
        {
            get { return GetProperty<bool>(); }
            internal set
            {
                value &= IsInEdit;
                SetProperty(value);

                if (Actions != null)
                {
                    var endEdit = (ActionBase)Actions.OfType<EndEdit>().FirstOrDefault() ?? Actions.OfType<Save>().FirstOrDefault();
                    if (endEdit != null)
                        endEdit.CanExecute = value;
                }
            }
        }

        internal string SecurityToken { get { return GetProperty<string>(); } set { SetProperty(value); } }

        private string BackupSecurityToken { get { return GetProperty<string>(); } set { SetProperty(value); } }

        internal async Task RefreshFromResult(PersistentObject result)
        {
            SetNotification(result.Notification, result.NotificationType);

            if (Attributes != null && result.Attributes != null)
            {
                foreach (var attr in Attributes)
                {
                    var serviceAttribute = result.Attributes.FirstOrDefault(a => a.Id == attr.Id);
                    if (serviceAttribute != null)
                    {
                        attr.OptionsDirect = serviceAttribute.OptionsDirect;

                        if (attr.IsReadOnly != serviceAttribute.IsReadOnly)
                            attr.IsReadOnly = serviceAttribute.IsReadOnly;

                        if (attr.IsRequired != serviceAttribute.IsRequired)
                            attr.IsRequired = serviceAttribute.IsRequired;

                        if (attr.IsVisible != serviceAttribute.IsVisible)
                            attr.Visibility = serviceAttribute.Visibility;

                        attr.ValueDirect = serviceAttribute.ValueDirect;
                        var attrWithRef = attr as PersistentObjectAttributeWithReference;
                        var serviceAttrWithRef = serviceAttribute as PersistentObjectAttributeWithReference;
                        if (attrWithRef != null && serviceAttrWithRef != null)
                            attrWithRef.ObjectId = serviceAttrWithRef.ObjectId;

                        attr.TriggersRefresh = serviceAttribute.TriggersRefresh;
                        attr.IsValueChanged = serviceAttribute.IsValueChanged;
                        attr.ValidationError = serviceAttribute.ValidationError;
                    }
                }

                if (IsNew)
                {
                    ObjectId = result.ObjectId;
                    IsNew = result.IsNew;
                }

                SecurityToken = result.SecurityToken;
                IsDirty = Attributes.Any(a => a.IsValueChanged);

                if (result.Breadcrumb != null)
                    Breadcrumb = result.Breadcrumb;

                if (result.QueriesToRefresh != null && Queries != null)
                {
                    foreach (var id in result.QueriesToRefresh)
                    {
                        Query query = null;

                        Guid guid;
                        if (Guid.TryParse(id, out guid))
                            query = Queries.FirstOrDefault(q => q.Id == id);

                        if (query == null)
                            query = Queries.FirstOrDefault(q => string.Equals(q.Name, id, StringComparison.OrdinalIgnoreCase));

                        if (query != null && query.HasSearched)
                            await query.RefreshQueryAsync();
                    }
                }

                //if (changeLayout)
                //    Tabs.Run(t => t.ResetGroups());
            }
        }

        public async Task RefreshAttributesAsync(PersistentObjectAttribute attribute = null)
        {
            var parameters = attribute != null ? new Dictionary<string, string> { { "RefreshedPersistentObjectAttributeId", Service.ToServiceString(attribute.Id) } } : null;
            try
            {
                var result = await Service.Current.ExecuteActionAsync("PersistentObject.Refresh", this, null, null, parameters);

                SetNotification(result.Notification, result.NotificationType);

                if (!HasNotification || NotificationType != NotificationType.Error)
                    await RefreshFromResult(result);
            }
            catch (Exception ex)
            {
                SetNotification(ex.Message);
            }
        }

        public void SetNotification(string notification, NotificationType notificationType = NotificationType.Error)
        {
            NotificationType = notificationType;
            Notification = notification;
        }

        public PersistentObjectAttribute GetAttribute(string attributeName)
        {
            return Attributes.FirstOrDefault(a => a.Name == attributeName);
        }

        public object GetAttributeValue(string attributeName)
        {
            var attr = GetAttribute(attributeName);
            return attr != null ? attr.Value : null;
        }

        public void SetAttributeValue(string attributeName, object value)
        {
            var attr = GetAttribute(attributeName);
            if (attr != null)
                attr.Value = value;
        }

        #region Service Serialization

        protected override string[] GetServiceProperties()
        {
            return new[] { "id", "type", "objectId", "isNew", "isHidden", "bulkObjectIds", "securityToken" };
        }

        internal override JObject ToServiceObject()
        {
            var jObj = base.ToServiceObject();

            if (Parent != null)
                jObj["parent"] = Parent.ToServiceObject();

            jObj["attributes"] = JArray.FromObject(Attributes.Select(attr => attr.ToServiceObject()));

            return jObj;
        }

        #endregion
    }
}