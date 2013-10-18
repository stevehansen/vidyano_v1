using System;
using Newtonsoft.Json.Linq;
using Vidyano.Commands;

namespace Vidyano.ViewModel
{
    public abstract class ProgramUnitItem : ViewModelBase
    {
        internal ProgramUnitItem(JObject model)
            : base(model)
        {
            var jGroup = model["group"];
            if (jGroup != null)
            {
                GroupId = (string)jGroup["id"];
                GroupTitle = (string)jGroup["title"];
            }
        }

        protected ProgramUnitItem(string title, string name, string groupId, string groupTitle)
            : this(new JObject(new JProperty("title", title), new JProperty("name", name), new JProperty("group", new JObject(new JProperty("id", groupId), new JProperty("title", groupTitle)))))
        {
        }

        public string Title
        {
            get { return GetProperty<string>(); }
        }

        internal string Name
        {
            get { return GetProperty<string>(); }
        }

        public string GroupId { get; private set; }

        public string GroupTitle { get; private set; }

        public virtual int RowSpan
        {
            get { return 1; }
        }

        public virtual int ColumnSpan
        {
            get { return 1; }
        }

        protected internal virtual bool IncludeInZoomedOutItemCount
        {
            get { return true; }
        }

        public int ColumnOffset
        {
            get { return 1; }
        }

        protected internal abstract string Template { get; }

        internal static ProgramUnitItem Create(JObject model)
        {
            if (model["query"] != null)
                return new ProgramUnitItemQuery(model);
            if (model["persistentObject"] != null)
                return new ProgramUnitItemPersistentObject(model);

            return null;
        }

        protected internal virtual void Open() { }
    }

    public class ProgramUnitItemQuery : ProgramUnitItem
    {
        internal ProgramUnitItemQuery(JObject model)
            :
                base(model) { }

        public string QueryName
        {
            get { return GetProperty<string>(); }
        }

        public string Query
        {
            get { return GetProperty<string>(); }
        }

        public string Count
        {
            get { return GetProperty<string>(); }
        }

        protected internal override string Template
        {
            get { return "ProgramUnitItemTemplate.Query"; }
        }

        protected internal override async void Open()
        {
            string err = null;

            try
            {
                await new Navigate().Execute(Service.Current.GetQueryAsync(Query));
            }
            catch (Exception ex)
            {
                err = ex.Message;
            }

            if (!string.IsNullOrEmpty(err))
                await Service.Current.Hooks.ShowNotification(err, NotificationType.Error);
        }
    }

    public class ProgramUnitItemPersistentObject : ProgramUnitItem
    {
        internal ProgramUnitItemPersistentObject(JObject model)
            :
                base(model) { }

        public string PersistentObject
        {
            get { return GetProperty<string>(); }
        }

        public string PersistentObjectType
        {
            get { return GetProperty<string>(); }
        }

        public string ObjectId
        {
            get { return GetProperty<string>(); }
        }

        protected internal override string Template
        {
            get { return "ProgramUnitItemTemplate.PersistentObject"; }
        }

        protected internal override async void Open()
        {
            string err = null;

            try
            {
                await new Navigate().Execute(Service.Current.GetPersistentObjectAsync(PersistentObject, ObjectId));
            }
            catch (Exception ex)
            {
                err = ex.Message;
            }

            if (!string.IsNullOrEmpty(err))
                await Service.Current.Hooks.ShowNotification(err, NotificationType.Error);
        }
    }
}