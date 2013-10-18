using System;
using System.Collections;
using System.Collections.Generic;
using System.ComponentModel;
using System.Reflection;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Data;
using Windows.UI.Xaml.Media.Animation;

namespace Vidyano.View
{
    public class ViewModel
    {
        public static readonly DependencyProperty TriggersProperty = DependencyProperty.RegisterAttached("Triggers", typeof(Triggers), typeof(ViewModel), new PropertyMetadata(null));

        public static Triggers GetTriggers(DependencyObject obj)
        {
            var triggers = (Triggers)obj.GetValue(TriggersProperty);
            if (triggers == null)
            {
                triggers = new Triggers();
                SetTriggers(obj, triggers);
            }

            return triggers;
        }

        public static void SetTriggers(DependencyObject obj, Triggers value)
        {
            var fe = obj as FrameworkElement;
            if (fe != null)
            {
                value.Target = fe;
                obj.SetValue(TriggersProperty, value);
            }
        }
    }

    public class Triggers : DependencyObject, IList<Trigger>
    {
        private static readonly DependencyProperty DataContextProperty = DependencyProperty.Register("DataContext", typeof(object), typeof(Triggers), new PropertyMetadata(null, DataContext_Changed));
        private readonly List<Trigger> innerList = new List<Trigger>();
        private FrameworkElement _Target;

        private object DataContext
        {
            get { return GetValue(DataContextProperty); }
            set { SetValue(DataContextProperty, value); }
        }

        internal FrameworkElement Target
        {
            get { return _Target; }
            set
            {
                _Target = value;
                if (value != null)
                {
                    _Target.Loaded += Target_Loaded;
                    _Target.Unloaded += Target_Unloaded;
                }

                foreach (var trigger in this)
                    trigger.Target = value;

                BindingOperations.SetBinding(this, DataContextProperty, new Binding());
            }
        }

        private void Target_Loaded(object sender, RoutedEventArgs e)
        {
            foreach (var trigger in this)
                trigger.Hook(null, DataContext);
        }

        private void Target_Unloaded(object sender, RoutedEventArgs e)
        {
            foreach (var trigger in this)
            {
                if (trigger.IsHooked)
                    trigger.UnHook();
            }
        }

        private static void DataContext_Changed(DependencyObject d, DependencyPropertyChangedEventArgs e)
        {
            var triggers = d as Triggers;
            if (triggers == null)
                return;

            foreach (var trigger in triggers)
                trigger.Hook(e.OldValue, e.NewValue);
        }

        #region ICollection

        public void Add(Trigger item)
        {
            innerList.Add(item);
            item.Target = Target;
        }

        public void Clear()
        {
            innerList.Clear();
        }

        public bool Contains(Trigger item)
        {
            return innerList.Contains(item);
        }

        public void CopyTo(Trigger[] array, int arrayIndex)
        {
            innerList.CopyTo(array, arrayIndex);
        }

        public int Count
        {
            get { return innerList.Count; }
        }

        public bool IsReadOnly
        {
            get { return false; }
        }

        public bool Remove(Trigger item)
        {
            return innerList.Remove(item);
        }

        public IEnumerator<Trigger> GetEnumerator()
        {
            return innerList.GetEnumerator();
        }

        IEnumerator IEnumerable.GetEnumerator()
        {
            return innerList.GetEnumerator();
        }

        #endregion

        #region IList

        public int IndexOf(Trigger item)
        {
            return innerList.IndexOf(item);
        }

        public void Insert(int index, Trigger item)
        {
            innerList.Insert(index, item);
        }

        public void RemoveAt(int index)
        {
            innerList.RemoveAt(index);
        }

        public Trigger this[int index]
        {
            get { return innerList[index]; }
            set { innerList[index] = value; }
        }

        #endregion
    }

    public class Trigger : DependencyObject, IList<Setter>
    {
        public static readonly DependencyProperty PropertyProperty = DependencyProperty.Register("Property", typeof(string), typeof(Trigger), new PropertyMetadata(null));
        public static readonly DependencyProperty ValueProperty = DependencyProperty.Register("Value", typeof(object), typeof(Trigger), new PropertyMetadata(null));

        private readonly List<Setter> innerList = new List<Setter>();
        private PropertyInfo property;
        private object viewModel;

        public string Property
        {
            get { return (string)GetValue(PropertyProperty); }
            set { SetValue(PropertyProperty, value); }
        }

        public object Value
        {
            get { return GetValue(ValueProperty); }
            set { SetValue(ValueProperty, value); }
        }

        internal FrameworkElement Target { get; set; }

        internal bool IsHooked { get; set; }

        internal void Hook(object oldObj, object newObj)
        {
            if (IsHooked)
            {
                UnHook();
                viewModel = null;
                property = null;
            }

            viewModel = newObj;
            var inpc = newObj as INotifyPropertyChanged;
            if (inpc != null)
            {
                inpc.PropertyChanged += Obj_PropertyChanged;
                property = newObj.GetType().GetRuntimeProperty(Property);
            }

            CheckCondition();
            IsHooked = true;
        }

        internal void UnHook()
        {
            var inpc = viewModel as INotifyPropertyChanged;
            if(inpc != null)
                inpc.PropertyChanged -= Obj_PropertyChanged;
            IsHooked = false;
        }

        private void Obj_PropertyChanged(object sender, PropertyChangedEventArgs e)
        {
            if (e.PropertyName == Property)
                CheckCondition();
        }

        private void CheckCondition()
        {
            var val = property != null ? property.GetValue(viewModel) : viewModel;
            if (Convert.ToString(val) == Convert.ToString(Value) || Equals(val, Value))
            {
                var sb = new Storyboard();

                foreach (var setter in this)
                {
                    var target = !string.IsNullOrEmpty(setter.TargetName) ? Target.FindName(setter.TargetName) as DependencyObject : Target;
                    if (target == null)
                        continue;

                    sb.Children.Add(setter.GetAnimation(target));
                }

                sb.Begin();
            }
            else
            {
                var sb = new Storyboard();

                foreach (var setter in this)
                {
                    var target = !string.IsNullOrEmpty(setter.TargetName) ? Target.FindName(setter.TargetName) as DependencyObject : Target;
                    if (target == null)
                        continue;

                    var animation = setter.GetReversedAnimation(target);
                    if (animation != null)
                        sb.Children.Add(animation);
                }

                sb.Begin();
            }
        }

        #region ICollection

        public void Add(Setter item)
        {
            innerList.Add(item);
        }

        public void Clear()
        {
            innerList.Clear();
        }

        public bool Contains(Setter item)
        {
            return innerList.Contains(item);
        }

        public void CopyTo(Setter[] array, int arrayIndex)
        {
            innerList.CopyTo(array, arrayIndex);
        }

        public int Count
        {
            get { return innerList.Count; }
        }

        public bool IsReadOnly
        {
            get { return false; }
        }

        public bool Remove(Setter item)
        {
            return innerList.Remove(item);
        }

        public IEnumerator<Setter> GetEnumerator()
        {
            return innerList.GetEnumerator();
        }

        IEnumerator IEnumerable.GetEnumerator()
        {
            return innerList.GetEnumerator();
        }

        #endregion

        #region IList

        public int IndexOf(Setter item)
        {
            return innerList.IndexOf(item);
        }

        public void Insert(int index, Setter item)
        {
            innerList.Insert(index, item);
        }

        public void RemoveAt(int index)
        {
            innerList.RemoveAt(index);
        }

        public Setter this[int index]
        {
            get { return innerList[index]; }
            set { innerList[index] = value; }
        }

        #endregion
    }

    public class Setter : DependencyObject
    {
        public static readonly DependencyProperty TargetNameProperty = DependencyProperty.Register("TargetName", typeof(string), typeof(Setter), new PropertyMetadata(null));
        public static readonly DependencyProperty PropertyProperty = DependencyProperty.Register("Property", typeof(string), typeof(Setter), new PropertyMetadata(null));
        public static readonly DependencyProperty ValueProperty = DependencyProperty.Register("Value", typeof(object), typeof(Setter), new PropertyMetadata(null));
        private object backupValue;
        private bool hasBackupValue;

        public string TargetName
        {
            get { return (string)GetValue(TargetNameProperty); }
            set { SetValue(TargetNameProperty, value); }
        }

        public string Property
        {
            get { return (string)GetValue(PropertyProperty); }
            set { SetValue(PropertyProperty, value); }
        }

        public object Value
        {
            get { return GetValue(ValueProperty); }
            set { SetValue(ValueProperty, value); }
        }

        internal ObjectAnimationUsingKeyFrames GetAnimation(DependencyObject target)
        {
            var objSetter = new ObjectAnimationUsingKeyFrames();
            Storyboard.SetTarget(objSetter, target);
            Storyboard.SetTargetProperty(objSetter, Property);
            objSetter.KeyFrames.Add(new DiscreteObjectKeyFrame { KeyTime = KeyTime.FromTimeSpan(TimeSpan.FromSeconds(0)), Value = Value });

            var prop = target.GetType().GetRuntimeProperty(Property);
            backupValue = prop.GetValue(target);
            hasBackupValue = true;

            return objSetter;
        }

        internal ObjectAnimationUsingKeyFrames GetReversedAnimation(DependencyObject target)
        {
            if (!hasBackupValue)
                return null;

            var objSetter = new ObjectAnimationUsingKeyFrames();
            Storyboard.SetTarget(objSetter, target);
            Storyboard.SetTargetProperty(objSetter, Property);
            objSetter.KeyFrames.Add(new DiscreteObjectKeyFrame { KeyTime = KeyTime.FromTimeSpan(TimeSpan.FromSeconds(0)), Value = backupValue });

            backupValue = null;
            hasBackupValue = false;

            return objSetter;
        }
    }
}